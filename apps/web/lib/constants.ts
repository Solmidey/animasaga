// apps/web/lib/constants.ts

export const BASE_MAINNET = {
  chainId: 8453,
  name: "Base Mainnet",
  rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
} as const;

export const DEPLOYMENTS = {
  SagaRegistry: {
    address: "0xE5b05DA1C3A1cDF9438187c9C3f9621C5DDD325A" as const,
    deploymentBlock: 41338131,
  },
  ElyndraCommitment: {
    address: "0x2355451edBEE92138AB06231ED2b391089E9d4d1" as const,
  },
  Season: {
    seasonId: 1,
    seasonEndBlock: 41938131,
  },
} as const;
