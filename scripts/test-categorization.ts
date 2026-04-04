/**
 * Test Transaction Categorization
 * 
 * Tests AI categorization with few-shot learning
 */

// Load env BEFORE any imports
import { config } from 'dotenv';
config({ path: '.env.local' });

import { categorizeTransactions, normalizeMerchantName } from '../features/csv-import/lib/transaction-categorizer';
import { convertAmountToMilliunits } from '../lib/utils';

// Test user ID (replace with your actual Clerk user ID)
const TEST_USER_ID = 'user_2prdtCKGsnLw8bkzHcA1hkGmNfX';

async function testNormalization() {
  console.log('📋 Test 1: Merchant Name Normalization');
  console.log('─'.repeat(70));

  const testCases = [
    { input: 'AMAZON MKTPLACE', expected: 'Amazon' },
    { input: 'STARBUCKS #1234', expected: 'Starbucks' },
    { input: 'MERCADONA S.A.', expected: 'Mercadona' },
    { input: 'Netflix Inc.', expected: 'Netflix' },
    { input: 'SPOTIFY AB 12345', expected: 'Spotify Ab' },
  ];

  let passed = 0;
  for (const test of testCases) {
    const result = normalizeMerchantName(test.input);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} "${test.input}" → "${result}" (expected: "${test.expected}")`);
    if (result === test.expected) passed++;
  }

  console.log(`\nPassed: ${passed}/${testCases.length}\n`);
}

async function testCategorization() {
  console.log('📋 Test 2: AI Categorization');
  console.log('─'.repeat(70));

  const testTransactions = [
    {
      csvRowIndex: 0,
      date: '2024-03-15',
      amount: convertAmountToMilliunits(-45.32),
      payee: 'Mercadona',
      description: 'Weekly groceries',
    },
    {
      csvRowIndex: 1,
      date: '2024-03-16',
      amount: convertAmountToMilliunits(-12.50),
      payee: 'Starbucks Coffee',
      description: 'Morning coffee',
    },
    {
      csvRowIndex: 2,
      date: '2024-03-20',
      amount: convertAmountToMilliunits(2500.0),
      payee: 'Acme Corp',
      description: 'Salary deposit',
    },
    {
      csvRowIndex: 3,
      date: '2024-03-21',
      amount: convertAmountToMilliunits(-89.99),
      payee: 'AMAZON MKTPLACE',
      description: 'Online shopping',
    },
  ];

  try {
    console.log(`Categorizing ${testTransactions.length} transactions for user ${TEST_USER_ID}...\n`);

    const results = await categorizeTransactions(TEST_USER_ID, testTransactions);

    console.log('Results:\n');
    results.forEach((result) => {
      const tx = testTransactions.find((t) => t.csvRowIndex === result.csvRowIndex)!;
      console.log(`${result.csvRowIndex}. ${tx.payee} (${tx.amount / 1000})`);
      console.log(`   Category: ${result.suggestion.categoryName || 'NONE'} (${result.suggestion.categoryId || 'null'})`);
      console.log(`   Type: ${result.suggestion.transactionTypeName}`);
      console.log(`   Confidence: ${(result.suggestion.confidence * 100).toFixed(0)}%`);
      console.log(`   Normalized: ${result.suggestion.normalizedPayee}`);
      console.log(`   Reasoning: ${result.suggestion.reasoning}`);
      console.log(`   Review: ${result.suggestion.confidence < 0.7 ? '⚠️  MANUAL REVIEW REQUIRED' : '✅ AUTO-CATEGORIZE'}\n`);
    });

    // Summary
    const highConfidence = results.filter((r) => r.suggestion.confidence >= 0.7).length;
    const lowConfidence = results.filter((r) => r.suggestion.confidence < 0.7).length;

    console.log('Summary:');
    console.log(`  Total: ${results.length}`);
    console.log(`  High Confidence (≥70%): ${highConfidence}`);
    console.log(`  Requires Review (<70%): ${lowConfidence}`);

    if (results.length === testTransactions.length) {
      console.log('\n✅ PASS: All transactions categorized\n');
    } else {
      console.log('\n❌ FAIL: Some transactions missing\n');
    }
  } catch (error: any) {
    console.error('❌ Categorization failed:', error.message);
    if (error.message.includes('No categories found')) {
      console.log('\n💡 Tip: Create some categories first using the web app\n');
    }
  }
}

async function runTests() {
  console.log('🧪 Transaction Categorization Test Suite\n');
  console.log('═'.repeat(70));

  await testNormalization();
  await testCategorization();

  console.log('═'.repeat(70));
  console.log('🎉 Test suite completed!\n');
  process.exit(0);
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
