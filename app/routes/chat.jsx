/**
 * Chat API Route
 * Handles chat interactions with Claude API and tools
 */
import { json } from "@remix-run/node";
import MCPClient from "../mcp-client";
import { saveMessage, getConversationHistory, storeCustomerAccountUrl, getCustomerAccountUrl } from "../db.server";
import AppConfig from "../services/config.server";
import { createSseStream } from "../services/streaming.server";
import { createClaudeService } from "../services/claude.server";
import { createToolService } from "../services/tool.server";
import { unauthenticated } from "../shopify.server";

/**
 * Loader function for GET requests
 */
export async function loader({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }

  const url = new URL(request.url);

  if (url.searchParams.has("history") && url.searchParams.has("conversation_id")) {
    return handleHistoryRequest(url.searchParams.get("conversation_id"));
  }

  if (!url.searchParams.has("history") && request.headers.get("Accept") === "text/event-stream") {
    return handleChatRequest(request);
  }

  return json({ error: AppConfig.errorMessages.apiUnsupported }, { status: 400, headers: getCorsHeaders(request) });
}

/**
 * Action function for POST requests
 */
export async function action({ request }) {
  return handleChatRequest(request);
}

/**
 * Handle fetching conversation history
 */
async function handleHistoryRequest(conversationId) {
  const messages = await getConversationHistory(conversationId);
  return json({ messages });
}

/**
 * Handle chat requests (GET or POST)
 */
async function handleChatRequest(request) {
  try {
    const body = await request.json();
    const userMessage = body.message;
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: AppConfig.errorMessages.missingMessage }),
        { status: 400, headers: getSseHeaders(request) }
      );
    }

    const conversationId = body.conversation_id || Date.now().toString();
    const promptType = body.prompt_type || AppConfig.api.defaultPromptType;

    const responseStream = createSseStream(async (stream) => {
      await handleChatSession({ request, userMessage, conversationId, promptType, stream });
    });

    return new Response(responseStream, { headers: getSseHeaders(request) });
  } catch (error) {
    console.error("Error in chat request handler:", error);
    return json({ error: error.message }, { status: 500, headers: getCorsHeaders(request) });
  }
}

/**
 * Handle a full chat session
 */
async function handleChatSession({ request, userMessage, conversationId, promptType, stream }) {
  const claudeService = createClaudeService();
  const toolService = createToolService();

  const shopId = request.headers.get("X-Shopify-Shop-Id");
  const shopDomain = request.headers.get("Origin");
  const customerMcpEndpoint = await getCustomerMcpEndpoint(shopDomain, conversationId);
  const mcpClient = new MCPClient(shopDomain, conversationId, shopId, customerMcpEndpoint);

  try {
    stream.sendMessage({ type: "id", conversation_id: conversationId });

    let storefrontMcpTools = [], customerMcpTools = [];
    try {
      storefrontMcpTools = await mcpClient.connectToStorefrontServer();
      customerMcpTools = await mcpClient.connectToCustomerServer();
      console.log(`Connected to MCP with ${storefrontMcpTools.length} tools`);
      console.log(`Connected to customer MCP with ${customerMcpTools.length} tools`);
    } catch (error) {
      console.warn("Failed to connect to MCP servers, continuing without tools:", error.message);
    }

    await saveMessage(conversationId, "user", userMessage);

    const dbMessages = await getConversationHistory(conversationId);
    const conversationHistory = dbMessages.map((msg) => {
      let content;
      try {
        content = JSON.parse(msg.content);
      } catch (e) {
        content = msg.content;
      }
      return { role: msg.role, content };
    });

    // Stream conversation to Claude
    await claudeService.streamConversation(
      {
        messages: conversationHistory,
        promptType,
        tools: mcpClient.tools
      },
      {
        onText: (textDelta) => stream.sendMessage({ type: "chunk", chunk: textDelta }),

        onMessage: async (message) => {
          conversationHistory.push({ role: message.role, content: message.content });
          await saveMessage(conversationId, message.role, JSON.stringify(message.content));
          stream.sendMessage({ type: "message_complete" });
        },

        onToolUse: async (toolUse) => {
          try {
            const toolResponse = await mcpClient.callTool(toolUse.name, toolUse.input);
            const toolResult = toolResponse.error
              ? { error: toolResponse.error }
              : { result: toolResponse.result || toolResponse };

            stream.sendMessage({
              type: "tool_result",
              tool_use_id: toolUse.id,
              tool_result: toolResult
            });

            if (!toolResponse.error) {
              await toolService.handleToolSuccess(
                toolResponse,
                toolUse.name,
                toolUse.id,
                conversationHistory,
                [],
                conversationId
              );
            }
          } catch (error) {
            console.error("Error handling tool use:", error);
            stream.sendMessage({
              type: "tool_result",
              tool_use_id: toolUse.id,
              tool_result: { error: error.message || "Tool execution failed" }
            });
          }
        },

        onContentBlock: (contentBlock) => {
          if (contentBlock.type === "text") {
            stream.sendMessage({ type: "content_block_complete", content_block: contentBlock });
          }
        }
      }
    );

    stream.sendMessage({ type: "end_turn" });
  } catch (error) {
    throw error;
  }
}

/**
 * Get customer MCP endpoint for a shop
 */
async function getCustomerMcpEndpoint(shopDomain, conversationId) {
  try {
    const existingUrl = await getCustomerAccountUrl(conversationId);
    if (existingUrl) return `${existingUrl}/customer/api/mcp`;

    const { hostname } = new URL(shopDomain);
    const { storefront } = await unauthenticated.storefront(hostname);
    const response = await storefront.graphql(
      `query shop { shop { customerAccounts { edges { node { url } } } } }`
    );
    const customerAccountUrl = response.data.shop.customerAccounts.edges[0].node.url;

    await storeCustomerAccountUrl(conversationId, customerAccountUrl);
    return `${customerAccountUrl}/customer/api/mcp`;
  } catch (error) {
    console.error("Error getting customer MCP endpoint:", error);
    return null;
  }
}

/**
 * CORS headers helper
 */
function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  const requestHeaders = request.headers.get("Access-Control-Request-Headers") || "Content-Type, Accept";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": requestHeaders,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400"
  };
}

/**
 * SSE headers helper
 */
function getSseHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
    "Access-Control-Allow-Headers":
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  };
}
