import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const models = await genAI.listModels();
    console.log('Available Gemini models:');
    models.forEach((model) => {
      console.log(`- ${model.name}`);
      console.log(`  Display name: ${model.displayName}`);
      console.log(`  Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
