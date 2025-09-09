/**
 * Claude Service
 * Manages interactions with the Claude API
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
  // Initialize Claude client
  const anthropic = new Anthropic({ apiKey });

  /**
   * Streams a conversation with Claude
   * Falls back to non-streaming if streaming fails
   */
  const streamConversation = async (
    { messages, promptType = AppConfig.api.defaultPromptType, tools },
    streamHandlers
  ) => {
    // Get system prompt
    const systemInstruction = getSystemPrompt(promptType);

    // Log which model is being used
    console.log(`[Claude Service] Using model: ${AppConfig.api.defaultModel}`);

    try {
      // --- Attempt Streaming API ---
      const stream = await anthropic.messages.stream({
        model: AppConfig.api.defaultModel, // e.g. "claude-3-7-sonnet-latest"
        max_tokens: AppConfig.api.maxTokens,
        system: systemInstruction,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
      });

      // Streaming event handlers
      stream.on("content_block_delta", (event) => {
        const deltaText = event.delta?.text || "";
        if (deltaText && streamHandlers.onText) {
          streamHandlers.onText(deltaText);
        }
      });

      stream.on("message_stop", (event) => {
        if (streamHandlers.onMessage) {
          streamHandlers.onMessage(event);
        }
      });

      stream.on("error", (err) => {
        console.error("Claude stream error:", err);
      });

      // Wait for final message
      const finalMessage = await stream.finalMessage();

      // Process tool use requests
      if (streamHandlers.onToolUse && finalMessage?.content) {
        for (const content of finalMessage.content) {
          if (content.type === "tool_use") {
            await streamHandlers.onToolUse(content);
          }
        }
      }

      return finalMessage;
    } catch (err) {
      console.error("Streaming failed, falling back to non-streaming:", err);

      // --- Non-streaming fallback ---
      const response = await anthropic.messages.create({
        model: AppConfig.api.defaultModel,
        max_tokens: AppConfig.api.maxTokens,
        system: systemInstruction,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
      });

      const finalMessage = response;

      // Send full text back if onText handler exists
      if (streamHandlers.onText) {
        for (const block of response.content) {
          if (block.type === "text") {
            streamHandlers.onText(block.text);
          }
        }
      }

      // Call onMessage once
      if (streamHandlers.onMessage) {
        streamHandlers.onMessage(finalMessage);
      }

      // Handle tool use if present
      if (streamHandlers.onToolUse && finalMessage?.content) {
        for (const content of finalMessage.content) {
          if (content.type === "tool_use") {
            await streamHandlers.onToolUse(content);
          }
        }
      }

      return finalMessage;
    }
  };

  /**
   * Gets the system prompt content for a given prompt type
   */
  const getSystemPrompt = (promptType) => {
    return (
      systemPrompts.systemPrompts[promptType]?.content ||
      systemPrompts.systemPrompts[AppConfig.api.defaultPromptType].content
    );
  };

  return {
    streamConversation,
    getSystemPrompt,
  };
}

export default {
  createClaudeService,
};