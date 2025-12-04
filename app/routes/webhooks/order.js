import prisma from "../../prisma/prismaClient";

export async function webhookOrderHandler(req, res) {
  try {
    const order = req.body;

    const shop = req.headers["x-shopify-shop-domain"];
    const orderId = order.id.toString();
    const checkoutToken = order.checkout_token;

    // 🔍 Find attribution created from checkout webhook
    const checkoutAttr = await prisma.assistantOrderAttribution.findUnique({
      where: { checkoutToken }
    });

    if (!checkoutAttr) {
      return res.status(200).send("Not assistant-attributed order");
    }

    // Update attribution with final order ID
    await prisma.assistantOrderAttribution.update({
      where: { checkoutToken },
      data: {
        orderId
      }
    });

    // Save line items attribution
    const items = order.line_items || [];

    for (const item of items) {
      await prisma.assistantOrderItemAttribution.create({
        data: {
          orderAttrId: checkoutAttr.id,
          productVariantId: item.variant_id?.toString() || "unknown",
          quantity: item.quantity,
          linePrice: parseFloat(item.price) * item.quantity
        }
      });
    }

    console.log("Saved final order attribution");
    return res.status(200).send("OK");
  } catch (err) {
    console.error("Order webhook error:", err);
    res.status(500).send("Error");
  }
}