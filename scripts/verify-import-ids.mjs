#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

async function verifyIds() {
  console.log("🔍 Verificando IDs de transacciones fallidas...\n");

  // Transaction Types
  const txTypeIds = ["txp8azr12yckwhv9odnb30elu", "txd4b7kzpn2lmjv6cuqf9s3yw"];
  console.log("📋 Transaction Types:");
  console.log(`   Buscando: ${txTypeIds.join(", ")}\n`);

  const types = await sql`
    SELECT id, name FROM transaction_types 
    WHERE id = ANY(${txTypeIds})
  `;

  console.log(`   Encontrados: ${types.length}/${txTypeIds.length}`);
  types.forEach((t) => console.log(`     ✅ ${t.id} → ${t.name}`));

  const missingTypes = txTypeIds.filter(
    (id) => !types.find((t) => t.id === id),
  );
  if (missingTypes.length > 0) {
    console.log(`     ❌ FALTANTES: ${missingTypes.join(", ")}`);
  }

  // Categories
  const catIds = [
    "2osh8dj5j552qjv1j85wsy09l",
    "zdp1iufwaun51yh0n1yqdu5jtw",
    "fx5nqyx7ue4wqitwrntvxb8ep",
  ];
  console.log("\n📁 Categories:");
  console.log(`   Buscando: ${catIds.join(", ")}\n`);

  const cats = await sql`
    SELECT id, name, parent_id FROM categories 
    WHERE id = ANY(${catIds})
  `;

  console.log(`   Encontrados: ${cats.length}/${catIds.length}`);
  cats.forEach((c) =>
    console.log(
      `     ✅ ${c.id} → ${c.name}${c.parent_id ? " (child)" : " (parent)"}`,
    ),
  );

  const missingCats = catIds.filter((id) => !cats.find((c) => c.id === id));
  if (missingCats.length > 0) {
    console.log(`     ❌ FALTANTES: ${missingCats.join(", ")}`);
  }

  // Account
  const accountId = "vqwhspkv51vzsy33d1fxn9n4a";
  console.log("\n🏦 Account:");
  console.log(`   Buscando: ${accountId}\n`);

  const accounts = await sql`
    SELECT id, name, user_id FROM accounts WHERE id = ${accountId}
  `;

  if (accounts[0]) {
    console.log(`     ✅ ${accounts[0].id} → ${accounts[0].name}`);
    console.log(`        User: ${accounts[0].user_id}`);
  } else {
    console.log(`     ❌ FALTANTE: ${accountId}`);
  }

  // Check if those exact transactions already exist
  console.log("\n🔄 Checking for duplicates:");
  const duplicates = await sql`
    SELECT 
      id,
      date,
      amount,
      payee
    FROM transactions
    WHERE 
      account_id = ${accountId}
      AND date = '2026-02-03T23:00:00.000Z'::timestamp
      AND (
        (amount = 15000 AND payee = 'BIZUM DE LUIS F V CONCEPTO uwu')
        OR (amount = -15000 AND payee LIKE 'COMPRA EN VIP DISTRICT%')
        OR (amount = 7500 AND payee LIKE 'BIZUM DE Agonay%')
        OR (amount = 7500 AND payee LIKE 'BIZUM DE MIRIAM%')
        OR (amount = -50 AND payee LIKE 'RETENCION HACIENDA%')
      )
    ORDER BY amount, payee
  `;

  console.log(`   Encontrados: ${duplicates.length} transacciones duplicadas`);
  if (duplicates.length > 0) {
    console.log("\n   ⚠️  ESTAS TRANSACCIONES YA EXISTEN:");
    duplicates.forEach((d) => {
      console.log(
        `     • ${d.date.toISOString().split("T")[0]} | ${(d.amount / 1000).toFixed(2)} EUR | ${d.payee.substring(0, 50)}`,
      );
    });
  } else {
    console.log("   ✅ No hay duplicados, el problema es otro");
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMEN:");
  console.log("=".repeat(80));
  console.log(`Transaction Types: ${types.length}/${txTypeIds.length} OK`);
  console.log(`Categories: ${cats.length}/${catIds.length} OK`);
  console.log(`Account: ${accounts.length > 0 ? "OK" : "FALTA"}`);
  console.log(`Duplicados: ${duplicates.length} encontrados`);
  console.log("=".repeat(80));

  process.exit(0);
}

verifyIds().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
