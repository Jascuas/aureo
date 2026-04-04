import { config } from 'dotenv';

config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY!;

// Try a simple test with the REST API directly
async function testAPI() {
  console.log('Testing Gemini API with simple text generation...\n');
  
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
  
  const body = {
    contents: [{
      parts: [{
        text: 'Say hello in JSON format: {"message": "your message here"}'
      }]
    }]
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', data);
      
      // Try listing models
      console.log('\nTrying to list available models...');
      const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
      const listResponse = await fetch(listUrl);
      const listData = await listResponse.json();
      
      if (listResponse.ok && listData.models) {
        console.log('\n✅ Available models:');
        listData.models.forEach((model: any) => {
          if (model.supportedGenerationMethods?.includes('generateContent')) {
            console.log(`  - ${model.name}`);
          }
        });
      } else {
        console.error('Could not list models:', listData);
      }
    } else {
      console.log('✅ Success:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testAPI();
