import { readdirSync, readFileSync } from "node:fs";
import path, { resolve } from "node:path";

import { config } from "dotenv";

export type QaProject = "axion" | "aureo";
type QaDatabaseDescriptor = { provider: "neon"; project_id: string; branch_id: string; database_name: string; allowed_host: string };
type QaClerkDescriptor = { instance_id?: string; user_id?: string; second_user_id?: string };
export type QaEnvironmentDescriptor = {
  version: 1;
  run_id: string;
  project: QaProject;
  candidate_sha: string;
  base_url: string;
  port: number;
  database: QaDatabaseDescriptor;
  fixtures_version: string;
  clerk?: QaClerkDescriptor;
};
export type E2EEnvironment = {
  baseUrl: string;
  port: string;
  runId: string;
  storageStatePath: string;
  managedQa: boolean;
  descriptor?: QaEnvironmentDescriptor;
};
type ResolveOptions = {
  project: QaProject;
  defaultPort: number;
  cwd?: string;
  environment?: Record<string, string | undefined>;
  readDescriptor?: (filePath: string) => string;
  loadLocalEnvironment?: (filePath: string) => void;
  listDirectory?: (directory: string) => string[];
};

const MANAGED_ENVIRONMENT_FILE = "HERMES_QA_ENVIRONMENT_FILE";
const MANAGED_RUN_ID = "HERMES_QA_RUN_ID";
const RUN_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const SECRET_KEY_PATTERN = /(secret|token|password|private.?key|database.?url|connection.?string)/i;
const NEXT_ENV_FILE_PATTERN = /^\.env(?:\.local|\.(?:development|production|test)(?:\.local)?)?$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) throw new Error(`Invalid QA descriptor field: ${key}`);
  return value;
};

const assertOnlyKeys = (record: Record<string, unknown>, allowed: readonly string[], location: string): void => {
  const unexpected = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) throw new Error(`Unexpected QA descriptor field: ${location}.${unexpected[0]}`);
};

const rejectSecretFields = (value: unknown, parent = "descriptor"): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectSecretFields(item, `${parent}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) throw new Error(`QA descriptor must not contain secret field: ${parent}.${key}`);
    rejectSecretFields(child, `${parent}.${key}`);
  }
};

const validateLocalOrigin = (baseUrl: string, port: number): void => {
  const parsed = new URL(baseUrl);
  if (
    parsed.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
    parsed.port !== String(port) ||
    parsed.pathname !== "/" ||
    parsed.search || parsed.hash || parsed.username || parsed.password
  ) {
    throw new Error("QA base_url must be an exact loopback HTTP origin whose port matches the descriptor");
  }
};

const parseDatabaseDescriptor = (value: unknown): QaDatabaseDescriptor => {
  if (!isRecord(value) || value.provider !== "neon") throw new Error("QA descriptor database.provider must be neon");
  assertOnlyKeys(value, ["provider", "project_id", "branch_id", "database_name", "allowed_host"], "database");
  return {
    provider: "neon",
    project_id: requireString(value, "project_id"),
    branch_id: requireString(value, "branch_id"),
    database_name: requireString(value, "database_name"),
    allowed_host: requireString(value, "allowed_host"),
  };
};

const parseClerkDescriptor = (value: unknown): QaClerkDescriptor | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("Invalid QA descriptor field: clerk");
  assertOnlyKeys(value, ["instance_id", "user_id", "second_user_id"], "clerk");
  const clerk: QaClerkDescriptor = {};
  for (const key of ["instance_id", "user_id", "second_user_id"] as const) {
    const candidate = value[key];
    if (candidate !== undefined) {
      if (typeof candidate !== "string" || candidate.length === 0) throw new Error(`Invalid QA descriptor field: clerk.${key}`);
      clerk[key] = candidate;
    }
  }
  return clerk;
};

export const parseQaEnvironmentDescriptor = (raw: string, expectedProject: QaProject): QaEnvironmentDescriptor => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error("QA environment descriptor is not valid JSON", { cause: error });
  }
  rejectSecretFields(value);
  if (!isRecord(value) || value.version !== 1 || value.project !== expectedProject) {
    throw new Error(`QA descriptor must be version 1 for project ${expectedProject}`);
  }
  assertOnlyKeys(
    value,
    ["version", "run_id", "project", "candidate_sha", "base_url", "port", "database", "fixtures_version", "clerk"],
    "descriptor",
  );
  const runId = requireString(value, "run_id");
  const candidateSha = requireString(value, "candidate_sha");
  const baseUrl = requireString(value, "base_url");
  const fixturesVersion = requireString(value, "fixtures_version");
  const port = value.port;
  if (!RUN_ID_PATTERN.test(runId)) throw new Error("QA descriptor run_id is not filesystem-safe");
  if (!SHA_PATTERN.test(candidateSha)) throw new Error("QA descriptor candidate_sha must be a full lowercase Git SHA");
  if (!Number.isInteger(port) || Number(port) < 1024 || Number(port) > 65535) {
    throw new Error("QA descriptor port must be an integer between 1024 and 65535");
  }
  validateLocalOrigin(baseUrl, Number(port));
  return {
    version: 1,
    run_id: runId,
    project: expectedProject,
    candidate_sha: candidateSha,
    base_url: baseUrl,
    port: Number(port),
    database: parseDatabaseDescriptor(value.database),
    fixtures_version: fixturesVersion,
    clerk: parseClerkDescriptor(value.clerk),
  };
};

const validateManagedDatabase = (
  environment: Record<string, string | undefined>,
  descriptor: QaEnvironmentDescriptor,
): void => {
  const injectedUrl = environment.HERMES_QA_DATABASE_URL;
  const mappedUrl = environment.DATABASE_URL;
  if (!injectedUrl || !mappedUrl || injectedUrl !== mappedUrl) {
    throw new Error("Managed QA requires HERMES_QA_DATABASE_URL to be validated and mapped exactly to DATABASE_URL");
  }
  let parsed: URL;
  try {
    parsed = new URL(injectedUrl);
  } catch (error) {
    throw new Error("Managed QA database URL is invalid", { cause: error });
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    parsed.hostname !== descriptor.database.allowed_host ||
    databaseName !== descriptor.database.database_name
  ) {
    throw new Error("Managed QA database URL does not match the validated descriptor identity");
  }
};

const applyManagedRuntimeOrigin = (
  environment: Record<string, string | undefined>,
  descriptor: QaEnvironmentDescriptor,
): void => {
  const expectedPort = String(descriptor.port);
  for (const [name, expected] of [
    ["PLAYWRIGHT_BASE_URL", descriptor.base_url],
    ["PLAYWRIGHT_PORT", expectedPort],
    ["NEXT_PUBLIC_APP_URL", descriptor.base_url],
  ] as const) {
    const existing = environment[name];
    if (existing && existing !== expected) {
      throw new Error(`${name} conflicts with the validated managed QA descriptor`);
    }
    environment[name] = expected;
  }
};

export const resolveE2EEnvironment = (options: ResolveOptions): E2EEnvironment => {
  const environment = options.environment ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const descriptorPath = environment[MANAGED_ENVIRONMENT_FILE];
  const runId = environment[MANAGED_RUN_ID];
  if (environment.HERMES_QA_REQUIRE_MANAGED === "1" && !descriptorPath && !runId) {
    throw new Error("HERMES_QA_REQUIRE_MANAGED forbids local E2E environment fallback");
  }
  if (descriptorPath || runId) {
    if (!descriptorPath || !runId) throw new Error(`Managed QA requires both ${MANAGED_ENVIRONMENT_FILE} and ${MANAGED_RUN_ID}`);
    if (!path.isAbsolute(descriptorPath)) throw new Error(`${MANAGED_ENVIRONMENT_FILE} must be an absolute path`);
    const listDirectory = options.listDirectory ?? readdirSync;
    const nextEnvironmentFile = listDirectory(cwd).find((name) => NEXT_ENV_FILE_PATTERN.test(name));
    if (nextEnvironmentFile) {
      throw new Error(`Managed QA checkout contains Next-loadable environment file: ${nextEnvironmentFile}`);
    }
    const readDescriptor = options.readDescriptor ?? ((filePath: string) => readFileSync(filePath, "utf8"));
    const descriptor = parseQaEnvironmentDescriptor(readDescriptor(descriptorPath), options.project);
    if (descriptor.run_id !== runId) throw new Error("HERMES_QA_RUN_ID does not match the QA descriptor");
    if (environment.HERMES_QA_TARGET_VALIDATED !== "1") {
      throw new Error("Managed QA requires trusted target validation before product startup");
    }
    validateManagedDatabase(environment, descriptor);
    if (descriptor.clerk?.user_id && environment.E2E_CLERK_USER_ID !== descriptor.clerk.user_id) {
      throw new Error("E2E_CLERK_USER_ID does not match the managed QA descriptor");
    }
    applyManagedRuntimeOrigin(environment, descriptor);
    return {
      baseUrl: descriptor.base_url,
      port: String(descriptor.port),
      runId,
      storageStatePath: path.join(".playwright", runId, `${options.project}-user.json`),
      managedQa: true,
      descriptor,
    };
  }

  const loadLocalEnvironment = options.loadLocalEnvironment ?? ((filePath: string) => config({ path: filePath, quiet: true }));
  loadLocalEnvironment(resolve(cwd, ".env.local"));
  const port = environment.PLAYWRIGHT_PORT ?? String(options.defaultPort);
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort < 1024 || numericPort > 65535) {
    throw new Error("PLAYWRIGHT_PORT must be an integer between 1024 and 65535");
  }
  const baseUrl = environment.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
  validateLocalOrigin(baseUrl, numericPort);
  if (environment.NEXT_PUBLIC_APP_URL && environment.NEXT_PUBLIC_APP_URL !== baseUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL must match the local Playwright origin");
  }
  environment.NEXT_PUBLIC_APP_URL = baseUrl;
  return {
    baseUrl,
    port,
    runId: "local",
    storageStatePath: path.join(".playwright", "local", `${options.project}-user.json`),
    managedQa: false,
  };
};

export const E2E_ENVIRONMENT = resolveE2EEnvironment({ project: "aureo", defaultPort: 4100 });
export const E2E_STORAGE_STATE_PATH = E2E_ENVIRONMENT.storageStatePath;
export const E2E_PORT = E2E_ENVIRONMENT.port;
export const E2E_BASE_URL = E2E_ENVIRONMENT.baseUrl;

const requiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required E2E environment variable: ${name}`);
  return value;
};
export const getE2EClerkUserEmail = (): string => requiredEnvironmentVariable("E2E_CLERK_USER_EMAIL");
export const getE2EClerkUserId = (): string => requiredEnvironmentVariable("E2E_CLERK_USER_ID");
