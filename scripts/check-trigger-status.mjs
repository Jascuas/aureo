#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

console.log("🔍 Checking trigger status...\n");

// Check triggers
const triggers = await sql`
  SELECT trigger_name, event_manipulation, event_object_table
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  ORDER BY event_object_table, trigger_name
`;

console.log("Triggers:");
triggers.forEach((t) => {
  console.log(
    `  - ${t.trigger_name} ON ${t.event_object_table} (${t.event_manipulation})`,
  );
});

// Check function
const [func] = await sql`
  SELECT pg_get_functiondef(oid) as definition
  FROM pg_proc 
  WHERE proname = 'update_account_balance'
`;

console.log("\nFunction definition (first 500 chars):");
console.log(func.definition.substring(0, 500) + "...\n");

process.exit(0);
