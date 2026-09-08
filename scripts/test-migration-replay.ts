import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync,readFileSync } from "node:fs";
import path from "node:path";

type Journal = { entries: Array<{ idx: number; tag: string }> };

const migrationDirectory = path.resolve(process.cwd(), "drizzle");
const journal = JSON.parse(
  readFileSync(path.join(migrationDirectory, "meta/_journal.json"), "utf8"),
) as Journal;
const journalTags = journal.entries
  .toSorted((left, right) => left.idx - right.idx)
  .map((entry) => entry.tag);
const sqlTags = readdirSync(migrationDirectory)
  .filter((fileName) => fileName.endsWith(".sql"))
  .map((fileName) => fileName.slice(0, -4))
  .toSorted();
const legacyUnjournaled = [
  "0002_fix_balance_trigger",
  "0003_fix_trigger_case_sensitivity",
  "0004_enable_pg_trgm",
];

assert.deepEqual(
  sqlTags.filter((tag) => !legacyUnjournaled.includes(tag)),
  journalTags,
  "Every active Aureo SQL migration must appear exactly once in the Drizzle journal",
);
assert.deepEqual(
  sqlTags.filter((tag) => !journalTags.includes(tag)),
  legacyUnjournaled,
  "Only documented historical migrations may remain outside the journal",
);

const containerName = `aureo-qa-migrations-${process.pid}`;
const docker = (args: string[], input?: string) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    input,
    stdio: input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
    timeout: 30_000,
  });
const runSql = (database: string, query: string) =>
  docker(
    [
      "exec",
      "-i",
      containerName,
      "psql",
      "--dbname",
      database,
      "--username",
      "postgres",
      "--set",
      "ON_ERROR_STOP=1",
      "--no-align",
      "--tuples-only",
    ],
    query,
  ).trim();

const waitForPostgres = () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      runSql("postgres", "SELECT 1;");
      return;
    } catch {
      if (attempt === 29) throw new Error("Local PostgreSQL did not become ready");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
    }
  }
};

const applyMigrations = (database: string, tags: readonly string[]) => {
  for (const tag of tags) {
    runSql(database, readFileSync(path.join(migrationDirectory, `${tag}.sql`), "utf8"));
  }
};

try {
  docker([
    "run",
    "--detach",
    "--rm",
    "--name",
    containerName,
    "--env",
    "POSTGRES_PASSWORD=postgres",
    "postgres:16-alpine",
  ]);
  waitForPostgres();
  runSql("postgres", "CREATE DATABASE qa_full; CREATE DATABASE qa_upgrade;");

  applyMigrations("qa_full", journalTags);
  applyMigrations("qa_upgrade", journalTags.slice(0, -1));
  applyMigrations("qa_upgrade", journalTags.slice(-1));

  for (const database of ["qa_full", "qa_upgrade"]) {
    assert.equal(runSql(database, "SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';"), "pg_trgm");
    assert.equal(runSql(database, "SELECT similarity('Aureo', 'Aurea') > 0;"), "t");
    assert.equal(runSql(database, "SELECT to_regclass('public.import_templates') IS NOT NULL;"), "t");
  }
  console.log(`Aureo migration replay passed for ${journalTags.length} journaled migrations.`);
} finally {
  try {
    docker(["rm", "--force", containerName]);
  } catch {
    // The container may not have started.
  }
}
