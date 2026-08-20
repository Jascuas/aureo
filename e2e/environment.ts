import { resolve } from "node:path";

import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required local E2E environment variable: ${name}`);
  }

  return value;
}

export const E2E_STORAGE_STATE_PATH = ".playwright/qa-user.json";
export const E2E_PORT = process.env.PLAYWRIGHT_PORT ?? "4100";
export const E2E_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://localhost:${E2E_PORT}`;

export function getE2EClerkUserEmail(): string {
  return requiredEnvironmentVariable("E2E_CLERK_USER_EMAIL");
}

export function getE2EClerkUserId(): string {
  return requiredEnvironmentVariable("E2E_CLERK_USER_ID");
}
