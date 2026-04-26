import { OpenRouter } from "@openrouter/sdk";

import { RateLimitError } from "@/lib/errors";

import {
  CATEGORIZATION_SYSTEM_PROMPT,
  COLUMN_DETECTION_SYSTEM_PROMPT,
  createCategorizationPrompt,
  createColumnDetectionPrompt,
  createDuplicateDetectionPrompt,
  DUPLICATE_DETECTION_SYSTEM_PROMPT,
} from "./prompts";
import type {
  AIProvider,
  AIProviderConfig,
  CategorizationResult,
  ColumnDetectionResult,
  DuplicateDetectionResult,
} from "./types";

export class OpenRouterProvider implements AIProvider {
  private client: OpenRouter;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.client = new OpenRouter({
      apiKey: config.apiKey,
    });
    this.model = config.model ?? "openrouter/free";
    this.temperature = config.temperature ?? 0.1;
    this.maxTokens = config.maxTokens ?? 16384;
  }

  private handleError(error: unknown, operation: string): never {
    const errorMessage = String(error);

    // Check for rate limit error (429)
    if (
      errorMessage.includes("429") ||
      errorMessage.includes("Too Many Requests") ||
      errorMessage.includes("Quota exceeded")
    ) {
      const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);
      const retryAfter = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;

      throw new RateLimitError(
        `OpenRouter API rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
        retryAfter,
        "OpenRouter",
      );
    }

    // Generic error
    console.error(`OpenRouter ${operation} error:`, error);
    throw new Error(`Failed to ${operation} with AI`, { cause: error });
  }

  private cleanJsonResponse(text: string): string {
    let cleaned = text.trim();

    // Remove markdown code blocks
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }

    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }

    return cleaned.trim();
  }

  private async generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<T> {
    try {
      // Use standard chat.send API (compatible with openrouter/free)
      const response = await this.client.chat.send({
        chatRequest: {
          model: this.model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: this.temperature,
          maxTokens: this.maxTokens,
        },
      });

      // Extract text from response
      const text = response.choices?.[0]?.message?.content || "";
      const cleanedText = this.cleanJsonResponse(text);

      return JSON.parse(cleanedText) as T;
    } catch (error) {
      this.handleError(error, "generate JSON");
    }
  }

  async detectColumns(params: {
    headers: string[];
    sampleRows: string[][];
    context?: string;
  }): Promise<ColumnDetectionResult> {
    const systemPrompt = COLUMN_DETECTION_SYSTEM_PROMPT;
    const userPrompt = createColumnDetectionPrompt(params);

    try {
      const result = await this.generateJSON<ColumnDetectionResult>(
        systemPrompt,
        userPrompt,
      );
      return result;
    } catch (parseError) {
      console.error("JSON parse error for column detection:", parseError);
      throw parseError;
    }
  }

  async detectDuplicates(params: {
    newTransactions: Array<{
      date: string;
      amount: number;
      payee: string;
      description?: string;
    }>;
    existingTransactions: Array<{
      id: string;
      date: string;
      amount: number;
      payee: string;
      description?: string;
    }>;
  }): Promise<DuplicateDetectionResult[]> {
    const systemPrompt = DUPLICATE_DETECTION_SYSTEM_PROMPT;
    const userPrompt = createDuplicateDetectionPrompt(params);

    try {
      const result = await this.generateJSON<{
        results: DuplicateDetectionResult[];
      }>(systemPrompt, userPrompt);
      return result.results;
    } catch (parseError) {
      console.error("JSON parse error for duplicate detection:", parseError);
      throw parseError;
    }
  }

  async categorizeTransactions(params: {
    transactions: Array<{
      csvRowIndex: number;
      date: string;
      amount: number;
      payee: string;
      description?: string;
      notes?: string;
    }>;
    availableCategories: Array<{
      id: string;
      name: string;
    }>;
    fewShotExamples?: Array<{
      payee: string;
      description?: string;
      categoryId: string;
      categoryName: string;
    }>;
    historicalHints?: Array<{
      csvRowIndex: number;
      topCategoryId: string;
      confidence: number;
      matchCount: number;
      matchType: "exact" | "fuzzy";
    }>;
  }): Promise<CategorizationResult[]> {
    const systemPrompt = CATEGORIZATION_SYSTEM_PROMPT;
    const userPrompt = createCategorizationPrompt(params);

    try {
      const result = await this.generateJSON<{
        results: CategorizationResult[];
      }>(systemPrompt, userPrompt);
      return result.results;
    } catch (parseError) {
      console.error("JSON parse error for categorization:", parseError);
      throw parseError;
    }
  }
}
