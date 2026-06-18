import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * Provider selection, in priority order:
 *   1. Nebius Token Factory  (NEBIUS_API_KEY)   ← default
 *   2. Anthropic             (ANTHROPIC_API_KEY)
 *   3. OpenAI                (OPENAI_API_KEY)
 *
 * Nebius is OpenAI-compatible, so we drive it through the AI SDK's
 * openai-compatible provider pointed at the Token Factory `/v1` endpoint.
 * We enable structured outputs so deck generation uses Nebius' JSON-schema
 * guided decoding (valid JSON, streamed). Set DECK_STRUCTURED_OUTPUTS=false
 * to fall back to plain json_object mode if a model misbehaves.
 */

const NEBIUS_BASE_URL =
  process.env.NEBIUS_BASE_URL?.trim() || "https://api.tokenfactory.nebius.com/v1";

// Default Nebius model. Override with DECK_MODEL. Note: avoid reasoning models
// (...-Thinking, DeepSeek-R1) for generation because their <think> tokens corrupt the
// streamed JSON. If a model can't honor json_schema, set
// DECK_STRUCTURED_OUTPUTS=false to drop to plain json_object mode.
const NEBIUS_DEFAULT_MODEL = "nvidia/Nemotron-3-Nano-Omni";

export function getModel(): LanguageModel {
  const explicit = process.env.DECK_MODEL?.trim();

  if (process.env.NEBIUS_API_KEY) {
    const nebius = createOpenAICompatible({
      name: "nebius",
      baseURL: NEBIUS_BASE_URL,
      apiKey: process.env.NEBIUS_API_KEY,
      supportsStructuredOutputs:
        process.env.DECK_STRUCTURED_OUTPUTS?.toLowerCase() !== "false",
    });
    return nebius.chatModel(explicit || NEBIUS_DEFAULT_MODEL);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic(explicit || "claude-sonnet-4-6");
  }
  if (process.env.OPENAI_API_KEY) {
    return openai(explicit || "gpt-4.1");
  }

  throw new Error(
    "No model API key configured. Set NEBIUS_API_KEY (recommended), or ANTHROPIC_API_KEY / OPENAI_API_KEY, in .env.local.",
  );
}

export function hasModelKey(): boolean {
  return Boolean(
    process.env.NEBIUS_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY,
  );
}
