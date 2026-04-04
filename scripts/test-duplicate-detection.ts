/**
 * Test Duplicate Detection
 * 
 * Tests exact and fuzzy duplicate matching.
 */

// Load env BEFORE any imports
import { config } from 'dotenv';
config({ path: '.env.local' });

// Now import after env is loaded
import { createId } from '@paralleldrive/cuid2';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { accounts, transactions } from '../db/schema';
import { detectDuplicates } from '../features/csv-import/lib/duplicate-matcher';
import { convertAmountToMilliunits } from '../lib/utils';

// Test user ID (you can use your actual Clerk user ID)
const TEST_USER_ID = 'user_test_duplicate_detection';

async function setupTestData() {
  console.log('🔧 Setting up test data...\n');

  // Disable trigger temporarily for testing
  await db.execute(sql`ALTER TABLE transactions DISABLE TRIGGER transactions_balance_trigger`);

  // Create test account
  const accountId = createId();
  await db.insert(accounts).values({
    id: accountId,
    userId: TEST_USER_ID,
    name: 'Test Account',
    plaidId: null,
    balance: 0, // Initialize balance to avoid trigger errors
  });

  console.log(`✅ Created test account: ${accountId}\n`);

  // Insert test transactions
  const testTransactions = [
    {
      id: createId(),
      userId: TEST_USER_ID,
      accountId,
      date: new Date('2024-03-15'),
      amount: convertAmountToMilliunits(-45.32),
      payee: 'Mercadona',
      notes: null,
      categoryId: null,
      typeId: null,
    },
    {
      id: createId(),
      userId: TEST_USER_ID,
      accountId,
      date: new Date('2024-03-16'),
      amount: convertAmountToMilliunits(-67.89),
      payee: 'Starbucks Coffee',
      notes: null,
      categoryId: null,
      typeId: null,
    },
    {
      id: createId(),
      userId: TEST_USER_ID,
      accountId,
      date: new Date('2024-03-20'),
      amount: convertAmountToMilliunits(2500.0),
      payee: 'Salary Deposit',
      notes: null,
      categoryId: null,
      typeId: null,
    },
  ];

  await db.insert(transactions).values(testTransactions);

  // Re-enable trigger
  await db.execute(sql`ALTER TABLE transactions ENABLE TRIGGER transactions_balance_trigger`);

  console.log('✅ Inserted test transactions:');
  testTransactions.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.date.toISOString().split('T')[0]} - ${t.payee} - ${t.amount / 1000}`);
  });
  console.log('');

  return accountId;
}

async function cleanupTestData(accountId: string) {
  console.log('\n🧹 Cleaning up test data...');
  
  // Disable trigger for cleanup
  await db.execute(sql`ALTER TABLE transactions DISABLE TRIGGER transactions_balance_trigger`);
  
  await db.delete(transactions).where(eq(transactions.accountId, accountId));
  await db.delete(accounts).where(eq(accounts.id, accountId));
  
  // Re-enable trigger
  await db.execute(sql`ALTER TABLE transactions ENABLE TRIGGER transactions_balance_trigger`);
  
  console.log('✅ Cleanup complete\n');
}

async function runTests() {
  console.log('🧪 Duplicate Detection Test Suite\n');
  console.log('═'.repeat(70));

  let accountId: string | null = null;

  try {
    accountId = await setupTestData();

    // Test 1: Exact match
    console.log('📋 Test 1: Exact Match');
    console.log('─'.repeat(70));
    const exactMatchInput = [
      {
        date: new Date('2024-03-15'),
        amount: convertAmountToMilliunits(-45.32),
        payee: 'Mercadona', // Exact same
      },
    ];

    const exactResult = await detectDuplicates(TEST_USER_ID, exactMatchInput);
    console.log('Result:', JSON.stringify(exactResult, null, 2));
    
    if (exactResult.exactMatches === 1) {
      console.log('✅ PASS: Exact match detected\n');
    } else {
      console.log('❌ FAIL: Exact match not detected\n');
    }

    // Test 2: Fuzzy match (similar payee)
    console.log('📋 Test 2: Fuzzy Match (Similar Payee)');
    console.log('─'.repeat(70));
    const fuzzyMatchInput = [
      {
        date: new Date('2024-03-16'),
        amount: convertAmountToMilliunits(-67.90), // Slightly different
        payee: 'Starbucks', // Similar but not exact
      },
    ];

    const fuzzyResult = await detectDuplicates(TEST_USER_ID, fuzzyMatchInput);
    console.log('Result:', JSON.stringify(fuzzyResult, null, 2));
    
    if (fuzzyResult.fuzzyMatches === 1) {
      console.log('✅ PASS: Fuzzy match detected\n');
    } else {
      console.log('❌ FAIL: Fuzzy match not detected\n');
    }

    // Test 3: No match
    console.log('📋 Test 3: No Match');
    console.log('─'.repeat(70));
    const noMatchInput = [
      {
        date: new Date('2024-03-25'),
        amount: convertAmountToMilliunits(-100.0),
        payee: 'Amazon',
      },
    ];

    const noMatchResult = await detectDuplicates(TEST_USER_ID, noMatchInput);
    console.log('Result:', JSON.stringify(noMatchResult, null, 2));
    
    if (noMatchResult.duplicates.length === 0) {
      console.log('✅ PASS: No duplicates detected (correct)\n');
    } else {
      console.log('❌ FAIL: False positive detected\n');
    }

    // Test 4: Batch processing
    console.log('📋 Test 4: Batch Processing');
    console.log('─'.repeat(70));
    const batchInput = [
      {
        date: new Date('2024-03-15'),
        amount: convertAmountToMilliunits(-45.32),
        payee: 'MERCADONA', // Case insensitive
      },
      {
        date: new Date('2024-03-25'),
        amount: convertAmountToMilliunits(-50.0),
        payee: 'New Transaction',
      },
      {
        date: new Date('2024-03-17'),
        amount: convertAmountToMilliunits(-68.0),
        payee: 'Starbucks Cafe', // Fuzzy match
      },
    ];

    const batchResult = await detectDuplicates(TEST_USER_ID, batchInput);
    console.log('Result:', JSON.stringify(batchResult, null, 2));
    
    console.log(`Summary: ${batchResult.exactMatches} exact, ${batchResult.fuzzyMatches} fuzzy, ${batchResult.totalDuplicates} total`);
    
    if (batchResult.totalDuplicates === 2) {
      console.log('✅ PASS: Batch processing works correctly\n');
    } else {
      console.log('❌ FAIL: Batch processing incorrect\n');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (accountId) {
      await cleanupTestData(accountId);
    }
  }

  console.log('═'.repeat(70));
  console.log('🎉 Test suite completed!\n');
  process.exit(0);
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
