import assert from "node:assert/strict";
import test from "node:test";

import { AUTH_SETUP_TEST_MATCH, AUTHENTICATED_TEST_IGNORE } from "../../e2e/project-selection";

test("Aureo auth setup is excluded from authenticated browser projects", () => {
  assert.equal(AUTH_SETUP_TEST_MATCH.test("e2e/auth.setup.ts"), true);
  assert.equal(AUTHENTICATED_TEST_IGNORE.test("e2e/auth.setup.ts"), true);
  assert.equal(AUTH_SETUP_TEST_MATCH.test("e2e/dashboard-accounts-card.spec.ts"), false);
  assert.equal(AUTHENTICATED_TEST_IGNORE.test("e2e/dashboard-accounts-card.spec.ts"), false);
});
