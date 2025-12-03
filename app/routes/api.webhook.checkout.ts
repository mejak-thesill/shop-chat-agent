import { webhookCheckoutHandler } from "./webhook.checkout";

export const action = webhookCheckoutHandler;
export const loader = () => new Response("Not allowed", { status: 405 });
