import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import crypto from "node:crypto";
import prisma from "../../db.server"; /// adjust import

function getHeader(request: Request, name: string) {
  return request.headers.get(name) ?? request.headers.get(name.toLowerCase());
}

function verifyShopifyHmac(rawBody: string, hmacHeader: string | null, secret: string) {
  if (!hmacHeader) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  // timing-safe compare
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const topic = getHeader(request, "x-shopify-topic") ?? "unknown";
  const shop = getHeader(request, "x-shopify-shop-domain") ?? null;
  const hmacHeader = getHeader(request, "x-shopify-hmac-sha256");

  // IMPORTANT: raw body must be untouched for HMAC
  const rawBody = await request.text();

  // ---- HMAC check (recommended) ----
  // For staging: you can comment this block, but enable before production.
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    console.warn("SHOPIFY_API_SECRET not set; skipping HMAC validation.");
  } else {
    const ok = verifyShopifyHmac(rawBody, hmacHeader, secret);
    if (!ok) {
      console.error("Invalid Shopify HMAC", { topic, shop });
      return json({ error: "Invalid HMAC" }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error("Webhook JSON parse error:", e);
    return json({ error: "Bad JSON" }, { status: 400 });
  }

  try {
    // 1) store the webhook event always
    await prisma.assistantEvent.create({
      data: {
        eventType: topic,
        rawPayload: {
          shop,
          topic,
          payload,
        },
      },
    });

    // 2) for orders/create also emit "order_completed" so analytics can be real
    if (topic === "orders/create") {
      await prisma.assistantEvent.create({
        data: {
          eventType: "order_completed",
          rawPayload: {
            shop,
            topic,
            payload,
          },
        },
      });
    }

    return json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("shopify.webhook DB error:", e);
    return json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
