/**
 * Test script for Gemini AI Provider
 * 
 * Run with: npx tsx scripts/test-gemini.ts
 */

import { config } from 'dotenv';
import { createAIProvider } from '../lib/ai';

// Load environment variables
config({ path: '.env.local' });

async function testGeminiProvider() {
  console.log('🧪 Testing Gemini AI Provider...\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  const ai = createAIProvider({
    provider: 'gemini',
    apiKey,
  });

  // ============================================================================
  // Test 1: Column Detection
  // ============================================================================
  console.log('📋 Test 1: Column Detection');
  console.log('─'.repeat(50));

  const testHeaders = ['Fecha', 'Concepto', 'Importe', 'Saldo'];
  const testSampleRows = [
    ['01/03/2024', 'Compra en Mercadona', '-45.32', '1234.56'],
    ['03/03/2024', 'Nómina', '2500.00', '3734.56'],
    ['05/03/2024', 'Transferencia a Juan', '-100.00', '3634.56'],
  ];

  try {
    const columnResult = await ai.detectColumns({
      headers: testHeaders,
      sampleRows: testSampleRows,
      context: 'Spanish bank CSV (MyInvestor)',
    });

    console.log('✅ Column detection successful!\n');
    console.log('Detected columns:');
    columnResult.columns.forEach((col) => {
      console.log(`  - ${col.name} (index ${col.index}): ${col.detectedType} (confidence: ${(col.confidence * 100).toFixed(0)}%)`);
    });
    console.log(`\nDate format: ${columnResult.dateFormat}`);
    console.log(`Amount format:`, columnResult.amountFormat);
  } catch (error) {
    console.error('❌ Column detection failed:', error);
    process.exit(1);
  }

  console.log('\n');

  // ============================================================================
  // Test 2: Transaction Categorization
  // ============================================================================
  console.log('🏷️  Test 2: Transaction Categorization');
  console.log('─'.repeat(50));

  const testTransactions = [
    {
      csvRowIndex: 0,
      date: '2024-03-01',
      amount: -45.32,
      payee: 'Mercadona',
      description: 'Compra supermercado',
    },
    {
      csvRowIndex: 1,
      date: '2024-03-03',
      amount: 2500.0,
      payee: 'Empresa XYZ',
      description: 'Nómina Marzo 2024',
    },
    {
      csvRowIndex: 2,
      date: '2024-03-05',
      amount: -12.5,
      payee: 'Starbucks',
      description: 'Coffee',
    },
  ];

  const availableCategories = [
    { id: 'cat_groceries', name: 'Groceries' },
    { id: 'cat_salary', name: 'Salary' },
    { id: 'cat_dining', name: 'Dining Out' },
    { id: 'cat_transport', name: 'Transportation' },
    { id: 'cat_utilities', name: 'Utilities' },
  ];

  const fewShotExamples = [
    {
      payee: 'Carrefour',
      description: 'Compra',
      categoryId: 'cat_groceries',
      categoryName: 'Groceries',
    },
    {
      payee: 'Lidl',
      categoryId: 'cat_groceries',
      categoryName: 'Groceries',
    },
  ];

  try {
    const categorizationResults = await ai.categorizeTransactions({
      transactions: testTransactions,
      availableCategories,
      fewShotExamples,
    });

    console.log('✅ Categorization successful!\n');
    categorizationResults.forEach((result) => {
      const tx = testTransactions[result.csvRowIndex];
      console.log(`Transaction: ${tx.payee} (${tx.amount})`);
      console.log(`  → Top suggestion: ${result.topSuggestion.categoryName} (confidence: ${(result.topSuggestion.confidence * 100).toFixed(0)}%)`);
      if (result.topSuggestion.reasoning) {
        console.log(`  → Reasoning: ${result.topSuggestion.reasoning}`);
      }
      console.log('');
    });
  } catch (error) {
    console.error('❌ Categorization failed:', error);
    process.exit(1);
  }

  // ============================================================================
  // Test 3: Duplicate Detection
  // ============================================================================
  console.log('🔄 Test 3: Duplicate Detection');
  console.log('─'.repeat(50));

  const newTransactions = [
    {
      date: '2024-03-01',
      amount: -45.32,
      payee: 'Mercadona Supermarket',
      description: 'Grocery shopping',
    },
  ];

  const existingTransactions = [
    {
      id: 'tx_001',
      date: '2024-03-01',
      amount: -45.32,
      payee: 'Mercadona',
      description: 'Compra supermercado',
    },
    {
      id: 'tx_002',
      date: '2024-03-02',
      amount: -50.0,
      payee: 'Carrefour',
    },
  ];

  try {
    const duplicateResults = await ai.detectDuplicates({
      newTransactions,
      existingTransactions,
    });

    console.log('✅ Duplicate detection successful!\n');
    duplicateResults.forEach((result, idx) => {
      const tx = newTransactions[result.csvRowIndex];
      console.log(`New transaction: ${tx.payee} (${tx.amount})`);
      
      if (result.duplicates.length === 0) {
        console.log('  → No duplicates found');
      } else {
        console.log(`  → Found ${result.duplicates.length} potential duplicate(s):`);
        result.duplicates.forEach((dup) => {
          console.log(`    • ${dup.matchType} match (similarity: ${(dup.similarity * 100).toFixed(0)}%)`);
          console.log(`      Fields: ${dup.matchedFields.join(', ')}`);
          if (dup.reasoning) {
            console.log(`      Reasoning: ${dup.reasoning}`);
          }
        });
      }
      console.log(`  → Recommendation: ${result.recommendation.toUpperCase()}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Duplicate detection failed:', error);
    process.exit(1);
  }

  console.log('─'.repeat(50));
  console.log('🎉 All tests passed! Gemini integration is working correctly.\n');
}

// Run tests
testGeminiProvider().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
