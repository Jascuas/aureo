import type { AIProvider, CreateAIProviderOptions } from './types';
import { GeminiProvider } from './gemini-provider';

export * from './types';

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
      throw new Error('Claude provider not yet implemented. Use "gemini" for now.');
    
    default:
      throw new Error(`Unknown AI provider: ${options.provider}`);
  }
}

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
