/**
 * Test script for import_templates schema
 * 
 * Run with: npx tsx scripts/test-import-templates-schema.ts
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { importTemplates, insertImportTemplateSchema } from '../db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function testImportTemplatesSchema() {
  console.log('🧪 Testing import_templates schema...\n');

  const testUserId = 'test_user_' + Date.now();
  const testTemplateId = 'tmpl_' + Date.now();

  try {
    // Test 1: Insert template
    console.log('📝 Test 1: Insert template');
    const newTemplate = {
      id: testTemplateId,
      userId: testUserId,
      name: 'MyInvestor - Cuenta Corriente',
      columnMapping: {
        date: 0,
        payee: 1,
        amount: 2,
        description: 3,
      },
      dateFormat: 'DD/MM/YYYY',
      amountFormat: {
        decimalSeparator: ',' as const,
        thousandsSeparator: '.' as const,
        isNegativeExpense: true,
      },
    };

    // Validate with Zod
    const validated = insertImportTemplateSchema.parse(newTemplate);
    console.log('  ✅ Zod validation passed');

    // Insert into DB
    await db.insert(importTemplates).values(validated);
    console.log('  ✅ Template inserted successfully\n');

    // Test 2: Read template
    console.log('📖 Test 2: Read template');
    const retrieved = await db
      .select()
      .from(importTemplates)
      .where(eq(importTemplates.id, testTemplateId));

    if (retrieved.length === 0) {
      throw new Error('Template not found after insert');
    }

    console.log('  ✅ Template retrieved:', {
      name: retrieved[0].name,
      dateFormat: retrieved[0].dateFormat,
      columnMapping: retrieved[0].columnMapping,
    });
    console.log('');

    // Test 3: Unique constraint (should fail)
    console.log('🔒 Test 3: Unique constraint (user_id + name)');
    try {
      await db.insert(importTemplates).values({
        id: 'tmpl_duplicate_' + Date.now(),
        userId: testUserId,
        name: 'MyInvestor - Cuenta Corriente', // Same name as before
        columnMapping: { date: 0 },
        dateFormat: 'MM/DD/YYYY',
        amountFormat: {
          decimalSeparator: '.',
          thousandsSeparator: ',',
          isNegativeExpense: false,
        },
      });
      console.log('  ❌ FAILED: Should have thrown unique constraint error');
    } catch (error: any) {
      const isUniqueError = 
        error.message?.includes('unique') || 
        error.code === '23505' ||
        error.cause?.code === '23505';
      
      if (isUniqueError) {
        console.log('  ✅ Unique constraint working correctly');
      } else {
        throw error;
      }
    }
    console.log('');

    // Test 4: Insert another template for same user (different name)
    console.log('➕ Test 4: Insert second template (same user, different name)');
    await db.insert(importTemplates).values({
      id: 'tmpl_second_' + Date.now(),
      userId: testUserId,
      name: 'OpenBank - Tarjeta Crédito',
      columnMapping: { date: 0, amount: 1, payee: 2 },
      dateFormat: 'YYYY-MM-DD',
      amountFormat: {
        decimalSeparator: '.',
        thousandsSeparator: '',
        isNegativeExpense: true,
      },
    });
    console.log('  ✅ Second template inserted\n');

    // Test 5: List all templates for user
    console.log('📋 Test 5: List all templates for user');
    const allTemplates = await db
      .select()
      .from(importTemplates)
      .where(eq(importTemplates.userId, testUserId));

    console.log(`  ✅ Found ${allTemplates.length} templates:`);
    allTemplates.forEach((t) => {
      console.log(`    - ${t.name} (${t.dateFormat})`);
    });
    console.log('');

    // Cleanup
    console.log('🧹 Cleanup: Deleting test data...');
    await db
      .delete(importTemplates)
      .where(eq(importTemplates.userId, testUserId));
    console.log('  ✅ Test data cleaned up\n');

    console.log('─'.repeat(50));
    console.log('🎉 All schema tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Cleanup on error
    try {
      await db
        .delete(importTemplates)
        .where(eq(importTemplates.userId, testUserId));
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

testImportTemplatesSchema();
