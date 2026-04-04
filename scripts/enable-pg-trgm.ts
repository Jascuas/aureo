import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function enableExtension() {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
    console.log('✅ Extension pg_trgm enabled');
    
    const result = await sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm'`;
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

enableExtension();
