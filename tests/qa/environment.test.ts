import assert from "node:assert/strict";
import test from "node:test";

import { parseQaEnvironmentDescriptor, resolveE2EEnvironment } from "../../e2e/environment";

const descriptor = {
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
  fixtures_version: "aureo-v1",
  clerk: { user_id: "user_primary", second_user_id: "user_secondary" },
} as const;

const managedEnvironment = {
  HERMES_QA_ENVIRONMENT_FILE: "/private/tmp/qa-descriptor.json",
  HERMES_QA_RUN_ID: descriptor.run_id,
  HERMES_QA_TARGET_VALIDATED: "1",
  HERMES_QA_DATABASE_URL: "postgresql://qa:masked@qa.example.neon.tech/aureo_qa",
  DATABASE_URL: "postgresql://qa:masked@qa.example.neon.tech/aureo_qa",
  E2E_CLERK_USER_ID: "user_primary",
};

test("managed QA does not load local env and isolates storage by run", () => {
  let loadedLocal = false;
  const result = resolveE2EEnvironment({
    project: "aureo",
    defaultPort: 4100,
    environment: { ...managedEnvironment },
    readDescriptor: () => JSON.stringify(descriptor),
    loadLocalEnvironment: () => {
      loadedLocal = true;
    },
  });
  assert.equal(loadedLocal, false);
  assert.equal(result.baseUrl, descriptor.base_url);
  assert.equal(result.storageStatePath, ".playwright/run_42/aureo-user.json");
});

test("managed QA refuses partial activation and mismatched database identity", () => {
  assert.throws(
    () => resolveE2EEnvironment({
      project: "aureo",
      defaultPort: 4100,
      environment: { HERMES_QA_RUN_ID: "run_42" },
      loadLocalEnvironment: () => assert.fail("must not load local env"),
    }),
    /requires both/,
  );
  assert.throws(
    () => resolveE2EEnvironment({
      project: "aureo",
      defaultPort: 4100,
      environment: {
        ...managedEnvironment,
        HERMES_QA_DATABASE_URL: "postgresql://qa:masked@other.example/aureo_qa",
        DATABASE_URL: "postgresql://qa:masked@other.example/aureo_qa",
      },
      readDescriptor: () => JSON.stringify(descriptor),
    }),
    /does not match the validated descriptor identity/,
  );
});

test("managed QA refuses files that Next would load after Playwright resolves the target", () => {
  assert.throws(
    () => resolveE2EEnvironment({
      project: "aureo",
      defaultPort: 4100,
      environment: { ...managedEnvironment },
      readDescriptor: () => JSON.stringify(descriptor),
      listDirectory: () => [".env.EXAMPLE", ".env.local"],
    }),
    /Next-loadable environment file: \.env\.local/,
  );
});

test("pilot policy can forbid local environment fallback", () => {
  assert.throws(
    () => resolveE2EEnvironment({
      project: "aureo",
      defaultPort: 4100,
      environment: { HERMES_QA_REQUIRE_MANAGED: "1" },
      loadLocalEnvironment: () => assert.fail("must not load local env"),
    }),
    /forbids local E2E environment fallback/,
  );
});

test("descriptor rejects secret fields and a base URL whose port differs", () => {
  assert.throws(
    () => parseQaEnvironmentDescriptor(JSON.stringify({ ...descriptor, token: "secret" }), "aureo"),
    /must not contain secret field/,
  );
  assert.throws(
    () => parseQaEnvironmentDescriptor(
      JSON.stringify({ ...descriptor, base_url: "http://localhost:4999" }),
      "aureo",
    ),
    /port matches the descriptor/,
  );
  assert.throws(
    () => parseQaEnvironmentDescriptor(JSON.stringify({ ...descriptor, undocumented: true }), "aureo"),
    /Unexpected QA descriptor field/,
  );
});

test("managed QA refuses an inherited application origin that conflicts with the descriptor", () => {
  assert.throws(
    () => resolveE2EEnvironment({
      project: "aureo",
      defaultPort: 4100,
      environment: { ...managedEnvironment, NEXT_PUBLIC_APP_URL: "http://localhost:4000" },
      readDescriptor: () => JSON.stringify(descriptor),
    }),
    /conflicts with the validated managed QA descriptor/,
  );
});

test("a descriptor alone cannot authorize a managed target", () => {
  const environment: Record<string, string | undefined> = { ...managedEnvironment };
  environment.HERMES_QA_TARGET_VALIDATED = undefined;
  assert.throws(
    () => resolveE2EEnvironment({
      project: "aureo",
      defaultPort: 4100,
      environment,
      readDescriptor: () => JSON.stringify(descriptor),
    }),
    /requires trusted target validation/,
  );
});
