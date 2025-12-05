import { authenticate } from "../../shopify.server";
import db from "../../db.server";
import { webhookCheckoutHandler } from "../webhooks/checkout";
import { webhookOrderHandler } from "../webhooks/order";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log("🔔 Incoming webhook:", topic, "from", shop);

  let payload = await request.json().catch(() => ({}));

  try {
    switch (topic) {
      case "CHECKOUTS_CREATE":
      case "CHECKOUTS_UPDATE":
        await webhookCheckoutHandler(payload, shop);
        break;

      case "ORDERS_CREATE":
        await webhookOrderHandler(payload, shop);
        break;

      case "APP_UNINSTALLED":
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
        break;

      default:
        console.log("⚠️ Unhandled webhook topic:", topic);
        // DO NOT THROW — just continue
        break;
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return new Response("Webhook error", { status: 500 });
  }
};

// Shopify will sometimes send GET requests to test
export const loader = () => {
  return new Response("Webhook endpoint ready", { status: 200 });
};
