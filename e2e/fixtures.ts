import type { QaEnvironmentDescriptor } from "./environment";

export const AUREO_FIXTURES_VERSION = "aureo-v1";

const fixturePrefix = (runId: string) => `qa-${runId.toLowerCase().replaceAll("_", "-")}`;

export const getAureoDashboardFixtureNames = (runId: string) => ({
  positive: `QA ${runId} Positive Account`,
  zero: `QA ${runId} Zero Account`,
  negative: `QA ${runId} Negative Account`,
});

export const buildAureoQaFixture = (descriptor: QaEnvironmentDescriptor) => {
  if (descriptor.project !== "aureo") throw new Error("Aureo fixtures require an Aureo QA descriptor");
  if (descriptor.fixtures_version !== AUREO_FIXTURES_VERSION) {
    throw new Error(`Unsupported Aureo fixtures version: ${descriptor.fixtures_version}`);
  }
  const primaryUserId = descriptor.clerk?.user_id;
  if (!primaryUserId) throw new Error("Aureo QA fixtures require clerk.user_id");
  const secondaryUserId = descriptor.clerk?.second_user_id ?? `qa_aureo_${descriptor.run_id}_secondary`;
  if (secondaryUserId === primaryUserId) throw new Error("Aureo QA fixture owners must be distinct");

  const prefix = fixturePrefix(descriptor.run_id);
  const names = getAureoDashboardFixtureNames(descriptor.run_id);
  return {
    runId: descriptor.run_id,
    primaryUserId,
    secondaryUserId,
    accounts: [
      { id: `${prefix}-positive`, name: names.positive, userId: primaryUserId, expectedBalance: 125_000 },
      { id: `${prefix}-zero`, name: names.zero, userId: primaryUserId, expectedBalance: 0 },
      { id: `${prefix}-negative`, name: names.negative, userId: primaryUserId, expectedBalance: -75_000 },
      { id: `${prefix}-secondary`, name: `QA ${descriptor.run_id} Secondary Account`, userId: secondaryUserId, expectedBalance: 9_000 },
    ] as const,
    categories: [
      { id: `${prefix}-category`, name: `QA ${descriptor.run_id} Primary Category`, userId: primaryUserId },
      { id: `${prefix}-secondary-category`, name: `QA ${descriptor.run_id} Secondary Category`, userId: secondaryUserId },
    ] as const,
    transactions: [
      { id: `${prefix}-income`, accountId: `${prefix}-positive`, categoryId: `${prefix}-category`, amount: 125_000, type: "income" },
      { id: `${prefix}-expense`, accountId: `${prefix}-negative`, categoryId: `${prefix}-category`, amount: 75_000, type: "expense" },
      { id: `${prefix}-secondary-income`, accountId: `${prefix}-secondary`, categoryId: `${prefix}-secondary-category`, amount: 9_000, type: "income" },
    ] as const,
    importTemplate: {
      id: `${prefix}-template`,
      accountId: `${prefix}-positive`,
      userId: primaryUserId,
      name: `QA ${descriptor.run_id} Import`,
    },
  };
};
