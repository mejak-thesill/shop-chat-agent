import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import crypto from "node:crypto";
import prisma from "../../db.server"; // adjust if your prisma import path differs

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Shopify-Shop-Id",
  };
}

export async function loader() {
  // Optional: block GET
  return json({ ok: true }, { status: 200 });
}

export async function action({ request }: ActionFunctionArgs) {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(origin) });
  }

  let data: any;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(origin) });
  }

  const eventType = data?.event ?? null;
  const conversationId = data?.conversation_id ?? null;
  const productVariantId = data?.product_variant_id != null ? String(data.product_variant_id) : null;
  const quantity = data?.quantity != null ? Number(data.quantity) : null;
  const checkoutUrl = data?.checkout_url ?? null;

  const ts = data?.timestamp ? Number(data.timestamp) : null;
  const createdAt = ts ? new Date(ts) : new Date();

  try {
    await prisma.assistantEvent.create({
      data: {
        eventType: eventType ?? "unknown",
        conversationId,
        productVariantId,
        quantity,
        checkoutUrl,
        createdAt,
        rawPayload: data,
      },
    });

    return json({ ok: true }, { status: 200, headers: corsHeaders(origin) });
  } catch (e: any) {
    console.error("assistant.track DB error:", e);
    return json({ error: String(e?.message ?? e) }, { status: 500, headers: corsHeaders(origin) });
  }
}
