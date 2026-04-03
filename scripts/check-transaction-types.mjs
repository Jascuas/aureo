#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

async function checkTransactionTypes() {
  console.log("🔍 Checking transaction_types table...\n");

  const types = await sql`SELECT id, name FROM transaction_types ORDER BY id`;

  console.log("Transaction Types:");
  console.log("==================");
  types.forEach((type) => {
    console.log(`ID: ${type.id} | Name: "${type.name}"`);
  });

  console.log("\n✅ Done");
  process.exit(0);
}

checkTransactionTypes().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
