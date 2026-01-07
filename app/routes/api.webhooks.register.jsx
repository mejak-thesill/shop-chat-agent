import { registerWebhooks } from "../shopify.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  // Ensure this is protected behind Shopify app authentication
  await authenticate.admin(request);

  const result = await registerWebhooks();

  console.log("🔔 Webhook registration result:", result);

  return new Response("Webhooks registered", { status: 200 });
};
