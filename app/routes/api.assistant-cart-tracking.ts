// app/routes/api.assistant-cart-tracking.ts
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server"; // adjust to your prisma import

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();

    const {
      shop,              // my-store.myshopify.com
      cartId,            // Shopify Cart ID or token
      conversationId,    // optional: your Conversation.id
      items,             // [{ productVariantId, quantity }]
    } = body;

    if (!shop || !cartId || !Array.isArray(items)) {
      return json({ error: "Missing fields" }, { status: 400 });
    }

    // Upsert cart
    const cart = await prisma.assistantCart.upsert({
      where: { cartId },
      create: {
        shop,
        cartId,
        conversationId,
      },
      update: {
        conversationId,
      },
    });

    // Store items (one row per call; you can dedupe later if needed)
    const itemCreates = items.map((it: any) =>
      prisma.assistantCartItem.create({
        data: {
          assistantCartId: cart.id,
          productVariantId: it.productVariantId,
          quantity: it.quantity ?? 1,
        },
      })
    );

    await Promise.all(itemCreates);

    return json({ ok: true });
  } catch (e) {
    console.error("assistant-cart-tracking error", e);
    return json({ error: "Internal error" }, { status: 500 });
  }
}
