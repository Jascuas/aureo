/**
 * Gemini AI Provider Implementation
 * 
 * Uses Google's Gemini 1.5 Flash model for CSV import AI features.
 * Cost: $0.075 per 1M input tokens (40x cheaper than Claude)
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import type {
  AIProvider,
  AIProviderConfig,
  ColumnDetectionResult,
  DuplicateDetectionResult,
  CategorizationResult,
} from './types';
import {
  COLUMN_DETECTION_SYSTEM_PROMPT,
  createColumnDetectionPrompt,
  DUPLICATE_DETECTION_SYSTEM_PROMPT,
  createDuplicateDetectionPrompt,
  CATEGORIZATION_SYSTEM_PROMPT,
  createCategorizationPrompt,
} from './prompts';

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.temperature = config.temperature ?? 0.1; // Low temperature for deterministic results
    this.maxTokens = config.maxTokens ?? 2048;
    
    // Default to Gemini 2.5 Flash Lite (free tier with generous limits)
    const modelName = config.model ?? 'gemini-2.5-flash-lite';
    this.model = this.client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
    });
  }

  /**
   * Clean JSON response from markdown code blocks
   */
  private cleanJsonResponse(text: string): string {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    
    // Remove ```json and ``` markers
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7); // Remove ```json
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3); // Remove ```
    }
    
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3); // Remove trailing ```
    }
    
    return cleaned.trim();
  }

  /**
   * Detect column types and formats from CSV sample rows
   */
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
      
      // Parse JSON response
      const parsed = JSON.parse(cleanedText) as ColumnDetectionResult;
      
      return parsed;
    } catch (error) {
      console.error('Gemini column detection error:', error);
      throw new Error('Failed to detect columns with AI', { cause: error });
    }
  }

  /**
   * Detect potential duplicates using semantic similarity
   */
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
      
      // Parse JSON response
      const parsed = JSON.parse(cleanedText) as { results: DuplicateDetectionResult[] };
      
      return parsed.results;
    } catch (error) {
      console.error('Gemini duplicate detection error:', error);
      throw new Error('Failed to detect duplicates with AI', { cause: error });
    }
  }

  /**
   * Categorize transactions using few-shot learning
   */
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
      
      // Parse JSON response
      const parsed = JSON.parse(cleanedText) as { results: CategorizationResult[] };
      
      return parsed.results;
    } catch (error) {
      console.error('Gemini categorization error:', error);
      throw new Error('Failed to categorize transactions with AI', { cause: error });
    }
  }
}
