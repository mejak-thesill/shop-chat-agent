// app/routes/customer.api.mcp.jsx
import { json } from "@remix-run/node";
import { createMcpServer } from "~/services/mcp.server";
import { getShopifyCustomerClient } from "~/services/shopify.server";

export async function loader() {
  return json({ status: "Customer MCP server ready" });
}

export async function action({ request }) {
  try {
    const customerClient = await getShopifyCustomerClient(request);
    const mcpServer = createMcpServer({ customer: customerClient });

    // Pass the request through to MCP
    return await mcpServer.handleRequest(request);
  } catch (err) {
    console.error("Customer MCP error:", err);
    return json({ error: err.message }, { status: 500 });
  }
}
