/**
 * Column Detector Test Suite
 * 
 * Tests column detection with various CSV formats from different banks.
 */

import { detectColumns, createColumnMapping } from '../features/csv-import/lib/column-detector';
import { detectDateFormat, parseDate } from '../features/csv-import/lib/date-parser';

// ============================================================================
// Test Data: Different Bank CSV Formats
// ============================================================================

// MyInvestor (Spanish bank - DD/MM/YYYY, comma decimal)
const MYINVESTOR_CSV = {
  name: 'MyInvestor',
  headers: ['Fecha', 'Concepto', 'Importe', 'Saldo'],
  rows: [
    ['01/03/2024', 'Compra en Mercadona', '-45,32', '1234,56'],
    ['03/03/2024', 'Nómina Empresa XYZ', '2500,00', '3734,56'],
    ['05/03/2024', 'Transferencia a Juan', '-100,00', '3634,56'],
    ['10/03/2024', 'Compra Amazon', '-89,99', '3544,57'],
    ['15/03/2024', 'Alquiler apartamento', '-800,00', '2744,57'],
  ],
};

// OpenBank (Spanish - DD/MM/YYYY, comma decimal)
const OPENBANK_CSV = {
  name: 'OpenBank',
  headers: ['Fecha operación', 'Descripción', 'Importe', 'Saldo disponible'],
  rows: [
    ['15/01/2024', 'Compra Carrefour', '-52,45', '2500,00'],
    ['16/01/2024', 'Pago recibo luz', '-67,89', '2432,11'],
    ['20/01/2024', 'Transferencia recibida', '1000,00', '3432,11'],
    ['22/01/2024', 'Gasolinera Repsol', '-55,00', '3377,11'],
    ['25/01/2024', 'Restaurante italiano', '-45,50', '3331,61'],
  ],
};

// Trade Republic (German/International - YYYY-MM-DD, dot decimal)
const TRADE_REPUBLIC_CSV = {
  name: 'Trade Republic',
  headers: ['Date', 'Description', 'Amount', 'Balance'],
  rows: [
    ['2024-02-01', 'Apple Inc. (AAPL)', '-500.00', '5000.00'],
    ['2024-02-05', 'Microsoft (MSFT)', '-300.00', '4700.00'],
    ['2024-02-10', 'Dividend Apple', '5.50', '4705.50'],
    ['2024-02-15', 'Tesla (TSLA)', '-250.00', '4455.50'],
    ['2024-02-20', 'Deposit', '1000.00', '5455.50'],
  ],
};

// American Bank (MM/DD/YYYY, dot decimal)
const AMERICAN_BANK_CSV = {
  name: 'American Bank',
  headers: ['Transaction Date', 'Merchant', 'Amount', 'Running Balance'],
  rows: [
    ['03/01/2024', 'Walmart Supercenter', '-123.45', '2500.00'],
    ['03/05/2024', 'Starbucks Coffee', '-5.75', '2376.55'],
    ['03/10/2024', 'Salary Deposit', '3500.00', '5876.55'],
    ['03/15/2024', 'Amazon.com', '-89.99', '5786.56'],
    ['03/20/2024', 'Shell Gas Station', '-45.00', '5741.56'],
  ],
};

// Santander (Mixed format - DD-MM-YYYY, comma decimal)
const SANTANDER_CSV = {
  name: 'Santander',
  headers: ['Fecha valor', 'Concepto', 'Débito', 'Crédito', 'Saldo'],
  rows: [
    ['10-01-2024', 'Compra con tarjeta', '45,60', '', '1500,00'],
    ['12-01-2024', 'Ingreso nómina', '', '2100,00', '3600,00'],
    ['15-01-2024', 'Recibo teléfono', '35,90', '', '3564,10'],
    ['18-01-2024', 'Transferencia enviada', '200,00', '', '3364,10'],
    ['20-01-2024', 'Devolución compra', '', '45,60', '3409,70'],
  ],
};

// ============================================================================
// Tests
// ============================================================================

async function runTests() {
  console.log('🧪 Column Detector Test Suite\n');
  console.log('═'.repeat(70));

  const testCases = [
    MYINVESTOR_CSV,
    OPENBANK_CSV,
    TRADE_REPUBLIC_CSV,
    AMERICAN_BANK_CSV,
    SANTANDER_CSV,
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('─'.repeat(70));

    try {
      // Detect columns
      const result = await detectColumns(testCase.headers, testCase.rows, {
        minConfidence: 0.7,
        sampleSize: 10,
        enableAIFallback: false, // Test heuristics only first
      });

      console.log(`Detection method: ${result.method}`);
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

      // Test column mapping
      const mapping = createColumnMapping(result);
      console.log('\nColumn mapping:', mapping);

      // Test date parsing
      const dateCol = result.columns.find(c => c.type === 'date');
      if (dateCol && dateCol.samples[0]) {
        const parsedDate = parseDate(dateCol.samples[0], result.dateFormat);
        console.log(`\nDate parsing test: "${dateCol.samples[0]}" → ${parsedDate?.toISOString().split('T')[0]}`);
      }

      // Validate key columns detected
      const hasDate = result.columns.some(c => c.type === 'date' && c.confidence >= 0.7);
      const hasAmount = result.columns.some(c => c.type === 'amount' && c.confidence >= 0.7);
      const hasPayee = result.columns.some(c => c.type === 'payee' && c.confidence >= 0.5);

      if (hasDate && hasAmount) {
        console.log('\n✅ PASS: Key columns detected (date + amount)');
      } else {
        console.log('\n❌ FAIL: Missing key columns');
        if (!hasDate) console.log('  - Date column not detected');
        if (!hasAmount) console.log('  - Amount column not detected');
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 Test suite completed!\n');
}

// Run tests
runTests().catch(console.error);
