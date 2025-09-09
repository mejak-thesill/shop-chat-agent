// app/routes/api.mcp.jsx
import { json } from "@remix-run/node";
import { createMcpServer } from "~/services/mcp.server";
import { getShopifyStorefrontClient } from "~/services/shopify.server";

export async function loader() {
  return json({ status: "MCP server ready" });
}

export async function action({ request }) {
  try {
    const storefront = await getShopifyStorefrontClient();
    const mcpServer = createMcpServer({ storefront });

    // Pass the request through to MCP
    return await mcpServer.handleRequest(request);
  } catch (err) {
    console.error("MCP error:", err);
    return json({ error: err.message }, { status: 500 });
  }
}
