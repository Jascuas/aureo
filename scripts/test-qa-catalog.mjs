import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

test("QA catalog maps every tier to an explicit package command and effect contract", async () => {
  const [catalog, packageJson] = await Promise.all([
    readJson("../qa/checks.json"),
    readJson("../package.json"),
  ]);
  assert.equal(catalog.version, 2);
  assert.equal(catalog.project, "aureo");
  assert.equal(catalog.fixtures_version, "aureo-v1");
  for (const check of Object.values(catalog.checks)) {
    const scriptName = check.command.replace(/^pnpm /, "");
    assert.equal(typeof packageJson.scripts[scriptName], "string", `Missing package script ${scriptName}`);
    assert.equal(typeof check.network, "string");
    assert.equal(typeof check.database, "string");
    assert.equal(typeof check.writes, "string");
  }
  assert.equal(catalog.checks.unit.network, "none");
  assert.match(catalog.checks.fixtures.writes, /run-scoped two-owner/);
});
