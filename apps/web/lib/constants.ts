// apps/web/lib/constants.ts
export const BASE_MAINNET = {
  chainId: 8453,
  // Server-side reads use BASE_RPC_URL; client reads use NEXT_PUBLIC_BASE_RPC_URL (set in .env.local)
  rpcUrl:
    process.env.BASE_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    "https://base-rpc.publicnode.com",
} as const;

export const DEPLOYMENTS = {
  SagaRegistry: {
    address: "0xE5b05DA1C3A1cDF9438187c9C3f9621C5DDD325A",
    deploymentBlock: 41338131,
  },
  ElyndraCommitment: {
    address: "0x2355451edBEE92138AB06231ED2b391089E9d4d1",
    // ✅ Put the ACTUAL deployment block of ElyndraCommitment here
    // If you don't know it yet, keep it equal to SagaRegistry deployment block for now
    deploymentBlock: 41338452,
  },

  // ✅ NEW: WitnessRegistry (Onchain Witness)
  WitnessRegistry: {
    address:
      (process.env.NEXT_PUBLIC_WITNESS_REGISTRY_ADDRESS ||
        "0x3cea345e4b0f41596879F568894c2a548605D472") as `0x${string}`,
    deploymentBlock: 41479056,
  },
} as const;

// ✅ NEW: Season ID used for witness writes (client + server)
export const WITNESS_SEASON_ID = Number(process.env.NEXT_PUBLIC_WITNESS_SEASON_ID ?? "1");
