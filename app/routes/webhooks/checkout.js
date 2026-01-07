import prisma from "../../prisma/prismaClient";

export async function webhookCheckoutHandler(req, res) {
  try {
    const checkout = req.body;

    const shop = req.headers["x-shopify-shop-domain"];
    const checkoutToken = checkout.token;
    const cartId = checkout.cart_id; // Shopify sometimes gives cart token here

    // 🔍 Try to find assistant cart
    const assistantCart = await prisma.assistantCart.findFirst({
      where: {
        OR: [
          { cartId: cartId },
          { cartId: checkoutToken }
        ],
        shop
      }
    });

    if (!assistantCart) {
      return res.status(200).send("No assistant cart match");
    }

    // 💾 Record pending checkout attribution
    await prisma.assistantOrderAttribution.upsert({
      where: { checkoutToken },
      update: {
        totalAttributed: checkout.subtotal_price || 0,
        currency: checkout.currency || "USD"
      },
      create: {
        shop,
        checkoutToken,
        orderId: null, // will be filled later
        totalAttributed: checkout.subtotal_price || 0,
        currency: checkout.currency || "USD"
      }
    });

    console.log("Saved checkout attribution");
    return res.status(200).send("OK");
  } catch (err) {
    console.error("Checkout webhook error:", err);
    res.status(500).send("Error");
  }
}