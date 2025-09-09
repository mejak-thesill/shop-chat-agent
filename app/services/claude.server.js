/**
 * Claude Service
 * Manages interactions with Claude API
 */
import { Anthropic } from "@anthropic-ai/sdk";
import AppConfig from "./config.server";
import systemPrompts from "../prompts/prompts.json";

/**
 * Creates a Claude service instance
 * @param {string} apiKey - Claude API key
 * @returns {Object} Claude service with methods for interacting with Claude API
 */
export function createClaudeService(apiKey = process.env.CLAUDE_API_KEY) {
  const anthropic = new Anthropic({ apiKey });

  /**
   * Streams a conversation with Claude
   * @param {Object} params - Stream parameters
   * @param {Array} params.messages - Conversation history
   * @param {string} params.promptType - The type of system prompt to use
   * @param {Array} params.tools - Available tools for Claude
   * @param {Object} streamHandlers - Stream event handlers
   * @param {Function} streamHandlers.onText - Handles text chunks
   * @param {Function} streamHandlers.onMessage - Handles complete messages
   * @param {Function} streamHandlers.onToolUse - Handles tool use requests
   * @param {Function} streamHandlers.onContentBlock - Handles content block completions
   * @returns {Promise<Object>} The final message
   */
  const streamConversation = async ({ messages, promptType = AppConfig.api.defaultPromptType, tools }, streamHandlers) => {
    const systemInstruction = getSystemPrompt(promptType);

    // Create the streaming request to Claude
    const stream = await anthropic.messages.stream({
      model: AppConfig.api.defaultModel,
      max_tokens: AppConfig.api.maxTokens,
      system: systemInstruction,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined
    });

    // Handle incremental text
    if (streamHandlers.onText) {
      stream.on("text", streamHandlers.onText);
    }

    // Handle full message completion
    if (streamHandlers.onMessage) {
      stream.on("message", async (message) => {
        if (!message) return;
        await streamHandlers.onMessage(message);
      });
    }

    // Handle tool use requests from Claude
    if (streamHandlers.onToolUse) {
      stream.on("tool_use", async (toolUse) => {
        if (!toolUse) return;
        await streamHandlers.onToolUse(toolUse);
      });
    }

    // Handle individual content blocks (optional)
    if (streamHandlers.onContentBlock) {
      stream.on("contentBlock", async (block) => {
        if (!block) return;
        await streamHandlers.onContentBlock(block);
      });
    }

    // Wait for final message before returning
    const finalMessage = await stream.finalMessage();

    return finalMessage;
  };

  /**
   * Retrieve the system prompt content
   * @param {string} promptType
   * @returns {string} System prompt text
   */
  const getSystemPrompt = (promptType) => {
    return systemPrompts.systemPrompts[promptType]?.content ||
      systemPrompts.systemPrompts[AppConfig.api.defaultPromptType].content;
  };

  return {
    streamConversation,
    getSystemPrompt
  };
}

export default {
  createClaudeService
};
