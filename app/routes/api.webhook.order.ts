import { webhookOrderHandler } from "./webhook.order";

export const action = webhookOrderHandler;
export const loader = () => new Response("Not allowed", { status: 405 });
