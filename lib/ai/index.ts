import type {
  AIProvider,
  AIProviderType,
  CreateAIProviderOptions,
} from "./types";
import { GeminiProvider } from "./gemini-provider";
import { OpenRouterProvider } from "./openrouter-provider";

export * from "./types";

export function createAIProvider(options: CreateAIProviderOptions): AIProvider {
  switch (options.provider) {
    case "openrouter":
      return new OpenRouterProvider({
        apiKey: options.apiKey,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

    case "gemini":
      return new GeminiProvider({
        apiKey: options.apiKey,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

    case "claude":
      throw new Error(
        'Claude provider not yet implemented. Use "openrouter" or "gemini" for now.',
      );

    default:
      throw new Error(`Unknown AI provider: ${options.provider}`);
  }
}

export function getDefaultAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER as AIProviderType) ?? "gemini";
  const apiKey = process.env.AI_API_KEY ?? process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!apiKey) {
    throw new Error(
      "AI_API_KEY or GEMINI_API_KEY environment variable is required",
    );
  }

  return createAIProvider({
    provider,
    apiKey,
    model,
  });
}
