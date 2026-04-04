/**
 * AI Provider Factory
 * 
 * Central export point for AI abstraction layer.
 * Supports easy switching between Gemini and Claude.
 */

import type { AIProvider, CreateAIProviderOptions } from './types';
import { GeminiProvider } from './gemini-provider';

// Re-export types
export * from './types';

/**
 * Create an AI provider instance
 * 
 * @example
 * ```ts
 * // Using Gemini (default)
 * const ai = createAIProvider({
 *   provider: 'gemini',
 *   apiKey: process.env.GEMINI_API_KEY!,
 * });
 * 
 * // Switch to Claude in the future
 * const ai = createAIProvider({
 *   provider: 'claude',
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 * });
 * ```
 */
export function createAIProvider(options: CreateAIProviderOptions): AIProvider {
  switch (options.provider) {
    case 'gemini':
      return new GeminiProvider({
        apiKey: options.apiKey,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });
    
    case 'claude':
      // TODO: Implement ClaudeProvider in the future
      throw new Error('Claude provider not yet implemented. Use "gemini" for now.');
    
    default:
      throw new Error(`Unknown AI provider: ${options.provider}`);
  }
}

/**
 * Get the default AI provider for the application
 * Reads configuration from environment variables
 */
export function getDefaultAIProvider(): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  
  return createAIProvider({
    provider: 'gemini',
    apiKey,
  });
}
