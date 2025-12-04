import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log("🔔 Incoming webhook:", topic, "from", shop);

  // Parse raw webhook body
  let payload = await request.json().catch(() => ({}));

  switch (topic) {
    case "CHECKOUTS_CREATE":
    case "CHECKOUTS_UPDATE":
      await webhookCheckoutHandler(payload, shop);
      break;

    case "ORDERS_CREATE":
      await webhookOrderHandler(payload, shop);
      break;
    case 'APP_UNINSTALLED':
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }
      break;
    default:
      throw new Response('Unhandled webhook topic', { status: 404 });
  }

  return new Response();
};
