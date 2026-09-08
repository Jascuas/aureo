import assert from "node:assert/strict";
import test from "node:test";

import type { QaEnvironmentDescriptor } from "../../e2e/environment";
import { AUREO_FIXTURES_VERSION, buildAureoQaFixture } from "../../e2e/fixtures";

const descriptor: QaEnvironmentDescriptor = {
  version: 1,
  run_id: "run_42",
  project: "aureo",
  candidate_sha: "a".repeat(40),
  base_url: "http://127.0.0.1:4313",
  port: 4313,
  database: {
    provider: "neon",
    project_id: "project-qa",
    branch_id: "branch-run-42",
    database_name: "aureo_qa",
    allowed_host: "qa.example.neon.tech",
  },
  fixtures_version: AUREO_FIXTURES_VERSION,
  clerk: { user_id: "user_primary" },
};

test("Aureo fixture IDs are deterministic, run-scoped, and split between two owners", () => {
  const first = buildAureoQaFixture(descriptor);
  assert.deepEqual(first, buildAureoQaFixture(descriptor));
  assert.notEqual(first.primaryUserId, first.secondaryUserId);
  assert.equal(new Set(first.accounts.map((account) => account.id)).size, first.accounts.length);
  assert.ok(first.accounts.every((account) => account.id.includes("run-42")));
  assert.equal(first.transactions[0].accountId, first.accounts[0].id);
});

test("Aureo fixture generation rejects unsupported versions and duplicate owners", () => {
  assert.throws(
    () => buildAureoQaFixture({ ...descriptor, fixtures_version: "aureo-v0" }),
    /Unsupported Aureo fixtures version/,
  );
  assert.throws(
    () => buildAureoQaFixture({ ...descriptor, clerk: { user_id: "same", second_user_id: "same" } }),
    /must be distinct/,
  );
});
