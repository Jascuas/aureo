import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import type {
  AIProvider,
  AIProviderConfig,
  ColumnDetectionResult,
  DuplicateDetectionResult,
  CategorizationResult,
} from "./types";
import {
  COLUMN_DETECTION_SYSTEM_PROMPT,
  createColumnDetectionPrompt,
  DUPLICATE_DETECTION_SYSTEM_PROMPT,
  createDuplicateDetectionPrompt,
  CATEGORIZATION_SYSTEM_PROMPT,
  createCategorizationPrompt,
} from "./prompts";

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.temperature = config.temperature ?? 0.1;
    this.maxTokens = config.maxTokens ?? 16384; // Increased for batch processing

    const modelName = config.model ?? "gemini-2.5-flash-lite";
    this.model = this.client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
    });
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

  async detectColumns(params: {
    headers: string[];
    sampleRows: string[][];
    context?: string;
  }): Promise<ColumnDetectionResult> {
    const systemPrompt = COLUMN_DETECTION_SYSTEM_PROMPT;
    const userPrompt = createColumnDetectionPrompt(params);

    try {
      const result = await this.model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);

      const response = result.response;
      const text = response.text();
      const cleanedText = this.cleanJsonResponse(text);

      try {
        const parsed = JSON.parse(cleanedText) as ColumnDetectionResult;
        return parsed;
      } catch (parseError) {
        console.error("JSON parse error for column detection:");
        console.error("Raw text length:", text.length);
        console.error("Cleaned text length:", cleanedText.length);
        console.error("First 500 chars:", cleanedText.substring(0, 500));
        console.error(
          "Last 500 chars:",
          cleanedText.substring(cleanedText.length - 500),
        );
        throw parseError;
      }
    } catch (error) {
      console.error("Gemini categorization error:", error);
      throw new Error("Failed to categorize transactions with AI", {
        cause: error,
      });
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
      const result = await this.model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);

      const response = result.response;
      const text = response.text();
      const cleanedText = this.cleanJsonResponse(text);

      try {
        const parsed = JSON.parse(cleanedText) as {
          results: DuplicateDetectionResult[];
        };
        return parsed.results;
      } catch (parseError) {
        console.error("JSON parse error for duplicate detection:");
        console.error("Raw text length:", text.length);
        console.error("Cleaned text length:", cleanedText.length);
        console.error("First 500 chars:", cleanedText.substring(0, 500));
        console.error(
          "Last 500 chars:",
          cleanedText.substring(cleanedText.length - 500),
        );
        throw parseError;
      }
    } catch (error) {
      console.error("Gemini duplicate detection error:", error);
      throw new Error("Failed to detect duplicates with AI", { cause: error });
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
  }): Promise<CategorizationResult[]> {
    const systemPrompt = CATEGORIZATION_SYSTEM_PROMPT;
    const userPrompt = createCategorizationPrompt(params);

    try {
      const result = await this.model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);

      const response = result.response;
      const text = response.text();
      const cleanedText = this.cleanJsonResponse(text);

      try {
        const parsed = JSON.parse(cleanedText) as {
          results: CategorizationResult[];
        };
        return parsed.results;
      } catch (parseError: any) {
        console.error("JSON parse error for categorization:");
        console.error("Raw text length:", text.length);
        console.error("Cleaned text length:", cleanedText.length);
        console.error("Error message:", parseError.message);

        // If error mentions a position, show context around it
        const posMatch = parseError.message.match(/position (\d+)/);
        if (posMatch) {
          const errorPos = parseInt(posMatch[1], 10);
          const contextStart = Math.max(0, errorPos - 200);
          const contextEnd = Math.min(cleanedText.length, errorPos + 200);
          console.error(`Context around position ${errorPos}:`);
          console.error(cleanedText.substring(contextStart, contextEnd));
          console.error(
            " ".repeat(errorPos - contextStart) + "^--- ERROR HERE",
          );
        }

        console.error("First 500 chars:", cleanedText.substring(0, 500));
        console.error(
          "Last 500 chars:",
          cleanedText.substring(cleanedText.length - 500),
        );
        throw parseError;
      }
    } catch (error) {
      console.error("Gemini categorization error:", error);
      throw new Error("Failed to categorize transactions with AI", {
        cause: error,
      });
    }
  }
}
