import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";  // adjust import

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Shopify-Shop-Id",
  };
}

function parseDateParam(v: string | null, fallback: Date) {
  if (!v) return fallback;
  // supports YYYY-MM-DD
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return fallback;
  return d;
}

function periodBefore(from: Date, to: Date) {
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - durationMs);
  return { prevFrom, prevTo };
}

async function fetchEvents(eventType: string, from: Date, to: Date) {
  return prisma.assistantEvent.findMany({
    where: {
      eventType,
      createdAt: { gte: from, lt: to },
    },
    orderBy: { createdAt: "asc" },
  });
}

function safePayload(ev: any) {
  // rawPayload could be JSON already (Prisma Json), or string (older data)
  const raw = ev?.rawPayload;
  if (!raw) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

// ---------------- Popular Questions ----------------
async function fetchPopularQuestions(limit = 10) {
  // same idea as your lambda: count user messages by content (ignore JSON-like)
  const rows = await prisma.message.groupBy({
    by: ["content"],
    where: { role: "user" },
    _count: { content: true },
    orderBy: { _count: { content: "desc" } },
    take: limit,
  });

  const valid: Array<{ question: string; count: number }> = [];
  for (const r of rows) {
    const content = r.content;
    const count = r._count.content;
    if (typeof content !== "string") continue;
    const stripped = content.trim();
    if (stripped.startsWith("{") || stripped.startsWith("[")) continue;
    valid.push({ question: stripped, count });
  }
  return valid;
}

// ---------------- Engagement ----------------
async function engagementForRange(from: Date, to: Date) {
  const addToCartEvents = await fetchEvents("assistant_add_to_cart", from, to);
  console.log("🚀 ~ engagementForRange ~ addToCartEvents:", addToCartEvents)
  const checkoutClickEvents = await fetchEvents("assistant_checkout_click", from, to);
  console.log("🚀 ~ engagementForRange ~ checkoutClickEvents:", checkoutClickEvents)
  const orders = await fetchEvents("orders/create", from, to);
  console.log("🚀 ~ engagementForRange ~ orders:", orders)

  // "assistant_starts" = count assistant text blocks in Message table (existing logic style)
  // We keep it simple and match your old intention: count assistant messages rows (not event-based).
  const assistantMsgCount = await prisma.message.count({
    where: {
      role: "assistant",
      createdAt: { gte: from, lt: to },
    },
  });

  return {
    assistant_starts: assistantMsgCount,
    add_to_cart_clicks: addToCartEvents.length,
    checkout_clicks: checkoutClickEvents.length,
    orders: orders.length,
  };
}

async function fetchEngagementWithDelta(from: Date, to: Date) {
  const current = await engagementForRange(from, to);
  const { prevFrom, prevTo } = periodBefore(from, to);
  const prev = await engagementForRange(prevFrom, prevTo);

  return {
    ...current,
    assistant_starts_delta: current.assistant_starts - prev.assistant_starts,
    add_to_cart_clicks_delta: current.add_to_cart_clicks - prev.add_to_cart_clicks,
    checkout_clicks_delta: current.checkout_clicks - prev.checkout_clicks,
    orders_delta: current.orders - prev.orders,
  };
}

// ---------------- Top Products ----------------
async function fetchTopProducts(from: Date, to: Date, limit = 10) {
  const addEvents = await prisma.assistantEvent.findMany({
    where: { eventType: "assistant_add_to_cart", createdAt: { gte: from, lt: to } },
    select: { productVariantId: true, quantity: true },
  });

  const orderEvents = await prisma.assistantEvent.findMany({
    where: { eventType: "order_completed", createdAt: { gte: from, lt: to } },
    select: { rawPayload: true },
  });

  const addCounts = new Map<string, number>();
  const orderCounts = new Map<string, number>();

  for (const ev of addEvents) {
    const vid = ev.productVariantId;
    if (!vid) continue;
    const qty = ev.quantity ?? 1;
    addCounts.set(vid, (addCounts.get(vid) ?? 0) + qty);
  }

  for (const ev of orderEvents) {
    const raw = safePayload(ev);
    const payload = raw?.payload ?? raw; // depends how stored
    const lineItems = payload?.line_items ?? [];
    for (const item of lineItems) {
      const vid = item?.variant_id;
      const qty = Number(item?.quantity ?? 1);
      if (!vid) continue;
      const key = String(vid);
      orderCounts.set(key, (orderCounts.get(key) ?? 0) + qty);
    }
  }

  // Sort by add_to_cart
  const sorted = Array.from(addCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);

  // Product name lookup (same as before but lightweight fallback if missing token)
  // If you already have a Shopify GraphQL helper in Remix, plug it in here.
  async function productName(variantId: string) {
    return `Variant ${variantId}`; // keep simple; replace with your Shopify GraphQL call if needed
  }

  const result: any[] = [];
  for (const [vid, addQty] of sorted) {
    const orderQty = orderCounts.get(vid) ?? 0;
    const conversionRate = addQty > 0 ? Math.round((orderQty / addQty) * 10000) / 100 : 0;

    result.push({
      product_variant_id: vid,
      product_name: await productName(vid),
      add_to_cart: addQty,
      orders: orderQty,
      conversion_rate: conversionRate,
    });
  }

  return result;
}

// ---------------- Overview ----------------
async function overviewForRange(from: Date, to: Date) {
  const checkoutClicks = await fetchEvents("assistant_checkout_click", from, to);
  console.log("🚀 ~ overviewForRange ~ checkoutClicks:", checkoutClicks)
  const orderEvents = await fetchEvents("orders/create", from, to);
  console.log("🚀 ~ overviewForRange ~ orderEvents:", orderEvents)

  let totalRevenue = 0;
  for (const ev of orderEvents) {
    const raw = safePayload(ev);
    const payload = raw?.payload ?? raw;
    const lineItems = payload?.line_items ?? [];
    for (const item of lineItems) {
      const price = Number(item?.price ?? 0);
      const qty = Number(item?.quantity ?? 1);
      totalRevenue += price * qty;
    }
  }

  const orders = orderEvents.length;
  const checkoutClicksCount = checkoutClicks.length;
  const conversionRate = checkoutClicksCount > 0 ? (orders / checkoutClicksCount) * 100 : 0;
  const aov = orders > 0 ? totalRevenue / orders : 0;

  return {
    checkout_clicks: checkoutClicksCount,
    orders,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    aov: Math.round(aov * 100) / 100,
    conversion_rate: Math.round(conversionRate * 100) / 100,
  };
}

async function fetchOverviewWithDelta(from: Date, to: Date) {
  const current = await overviewForRange(from, to);
  console.log("🚀 ~ fetchOverviewWithDelta ~ current:", current)
  const { prevFrom, prevTo } = periodBefore(from, to);
  const prev = await overviewForRange(prevFrom, prevTo);
  console.log("🚀 ~ fetchOverviewWithDelta ~ prev:", prev)

  return {
    ...current,
    checkout_clicks_delta: current.checkout_clicks - prev.checkout_clicks,
    orders_delta: current.orders - prev.orders,
    total_revenue_delta: Math.round((current.total_revenue - prev.total_revenue) * 100) / 100,
    aov_delta: Math.round((current.aov - prev.aov) * 100) / 100,
    conversion_rate_delta: Math.round((current.conversion_rate - prev.conversion_rate) * 100) / 100,
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const metricType = url.searchParams.get("metric_type");
  const from = parseDateParam(url.searchParams.get("from"), new Date("2000-01-01"));
  const to = parseDateParam(url.searchParams.get("to"), new Date());

  try {
    if (metricType === "popular_questions") {
      const data = await fetchPopularQuestions(10);
      return json(data, { status: 200, headers: corsHeaders(origin) });
    }

    if (metricType === "engagement") {
      const data = await fetchEngagementWithDelta(from, to);
      return json(data, { status: 200, headers: corsHeaders(origin) });
    }

    if (metricType === "top_products") {
      const data = await fetchTopProducts(from, to, 10);
      return json(data, { status: 200, headers: corsHeaders(origin) });
    }

    if (metricType === "overview") {
      const data = await fetchOverviewWithDelta(from, to);
      return json(data, { status: 200, headers: corsHeaders(origin) });
    }

    return json({ error: "Invalid metric_type" }, { status: 400, headers: corsHeaders(origin) });
  } catch (e: any) {
    console.error("assistant.metrics error:", e);
    return json({ error: String(e?.message ?? e) }, { status: 500, headers: corsHeaders(origin) });
  }
}
