/**
 * Test AI Fallback
 * 
 * Test column detection with ambiguous headers that require AI assistance.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { detectColumns } from '../features/csv-import/lib/column-detector';

// Very ambiguous CSV (mixed content, hard to detect)
const AMBIGUOUS_CSV = {
  name: 'Very Ambiguous CSV',
  headers: ['A', 'B', 'C', 'D', 'E'],
  rows: [
    ['2024-03-15', 'REF123', 'Groceries', '45.32', 'EUR'],
    ['2024-03-16', 'REF124', 'Utilities', '67.89', 'EUR'],
    ['2024-03-20', 'REF125', 'Income', '2500.00', 'EUR'],
    ['2024-03-22', 'REF126', 'Transfer', '100.00', 'EUR'],
    ['2024-03-25', 'REF127', 'Shopping', '89.99', 'EUR'],
  ],
};

async function testAIFallback() {
  console.log('🤖 Testing AI Fallback\n');
  console.log('═'.repeat(70));
  console.log(`\n📋 CSV: ${AMBIGUOUS_CSV.name}`);
  console.log('─'.repeat(70));
  console.log('Headers:', AMBIGUOUS_CSV.headers);
  console.log('Sample row:', AMBIGUOUS_CSV.rows[0]);

  try {
    // Test with AI fallback enabled
    console.log('\n🔄 Running detection with AI fallback enabled...');
    const result = await detectColumns(AMBIGUOUS_CSV.headers, AMBIGUOUS_CSV.rows, {
      minConfidence: 0.7,
      sampleSize: 10,
      enableAIFallback: true,
    });

    console.log(`\nDetection method: ${result.method}`);
    console.log(`Overall confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`Date format: ${result.dateFormat}`);
    console.log(`Amount format:`, {
      decimal: result.amountFormat.decimalSeparator,
      thousands: result.amountFormat.thousandsSeparator || 'none',
      negativeExpense: result.amountFormat.isNegativeExpense,
    });

    console.log('\nDetected columns:');
    result.columns.forEach(col => {
      const status = col.confidence >= 0.7 ? '✅' : col.confidence >= 0.5 ? '⚠️' : '❌';
      console.log(
        `  ${status} [${col.index}] "${col.name}" → ${col.type} (${(col.confidence * 100).toFixed(0)}%)`
      );
    });

    if (result.method === 'ai') {
      console.log('\n✅ SUCCESS: AI fallback was used');
    } else {
      console.log('\n⚠️  Heuristic was sufficient (unexpected for this test)');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  console.log('\n' + '═'.repeat(70));
}

testAIFallback().catch(console.error);
