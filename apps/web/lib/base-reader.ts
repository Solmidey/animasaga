// apps/web/lib/base-reader.ts
import {
  createPublicClient,
  http,
  getAddress,
  type Abi,
  type Address,
  getAbiItem,
} from "viem";
import { base } from "viem/chains";

import SagaRegistryAbiRaw from "./abi/SagaRegistry.json";
import ElyndraCommitmentAbiRaw from "./abi/ElyndraCommitment.json";
import { BASE_MAINNET, DEPLOYMENTS, SEASON_END_BLOCK_FALLBACK } from "./constants";

const SagaRegistryAbi = SagaRegistryAbiRaw as Abi;
const ElyndraCommitmentAbi = ElyndraCommitmentAbiRaw as Abi;

const client = createPublicClient({
  chain: base,
  transport: http(BASE_MAINNET.rpcUrl, { batch: true }),
});

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hasFn(abi: Abi, name: string) {
  try {
    getAbiItem({ abi, name });
    return true;
  } catch {
    return false;
  }
}

async function readIfExists<T>({
  abi,
  address,
  functionName,
  args,
}: {
  abi: Abi;
  address: Address;
  functionName: string;
  args?: unknown[];
}): Promise<T | null> {
  if (!hasFn(abi, functionName)) return null;
  try {
    const result = await client.readContract({
      abi,
      address,
      functionName: functionName as any,
      args: (args ?? []) as any,
    });
    return result as T;
  } catch {
    return null;
  }
}

export type ChronicleSnapshot = {
  network: { name: string; chainId: number };
  contracts: { sagaRegistry: Address; elyndraCommitment: Address };

  season: {
    deploymentBlock: number;
    currentBlock: number;
    endBlock: number;
    blocksRemaining: number;
    progress: number; // 0..1
    estimatedTimeRemainingSeconds: number;
  };

  onchain: {
    elyndraCommitment: {
      registry: Address | null;
      isLocked: boolean | null;
      SAGA_ID: number | null;
      SEASON_ID: number | null;
      SEASON_END_BLOCK: number | null;
    };
  };

  generatedAt: string;
};

export async function getChronicleSnapshot(): Promise<ChronicleSnapshot> {
  const currentBlockBig = await client.getBlockNumber();
  const currentBlock = Number(currentBlockBig);

  const deploymentBlock = DEPLOYMENTS.SagaRegistry.deploymentBlock;

  const sagaRegistry = getAddress(DEPLOYMENTS.SagaRegistry.address);
  const elyndraCommitment = getAddress(DEPLOYMENTS.ElyndraCommitment.address);

  // ===== Read-only getters from ElyndraCommitment (based on your ABI names) =====
  const registryAddr = await readIfExists<Address>({
    abi: ElyndraCommitmentAbi,
    address: elyndraCommitment,
    functionName: "registry",
  });

  const isLocked = await readIfExists<boolean>({
    abi: ElyndraCommitmentAbi,
    address: elyndraCommitment,
    functionName: "isLocked",
  });

  const sagaId = await readIfExists<bigint>({
    abi: ElyndraCommitmentAbi,
    address: elyndraCommitment,
    functionName: "SAGA_ID",
  });

  const seasonId = await readIfExists<bigint>({
    abi: ElyndraCommitmentAbi,
    address: elyndraCommitment,
    functionName: "SEASON_ID",
  });

  const seasonEndBlockOnchain = await readIfExists<bigint>({
    abi: ElyndraCommitmentAbi,
    address: elyndraCommitment,
    functionName: "SEASON_END_BLOCK",
  });

  // Prefer onchain end block if available; fallback to your saved constant
  const endBlock = seasonEndBlockOnchain
    ? Number(seasonEndBlockOnchain)
    : SEASON_END_BLOCK_FALLBACK;

  const blocksRemaining = Math.max(0, endBlock - currentBlock);
  const span = Math.max(1, endBlock - deploymentBlock);
  const progress = clamp((currentBlock - deploymentBlock) / span, 0, 1);

  // UX estimate only
  const EST_BLOCK_TIME_SECONDS = 2;
  const estimatedTimeRemainingSeconds = blocksRemaining * EST_BLOCK_TIME_SECONDS;

  return {
    network: { name: BASE_MAINNET.name, chainId: BASE_MAINNET.chainId },
    contracts: { sagaRegistry, elyndraCommitment },
    season: {
      deploymentBlock,
      currentBlock,
      endBlock,
      blocksRemaining,
      progress,
      estimatedTimeRemainingSeconds,
    },
    onchain: {
      elyndraCommitment: {
        registry: registryAddr ? getAddress(registryAddr) : null,
        isLocked: isLocked ?? null,
        SAGA_ID: sagaId ? Number(sagaId) : null,
        SEASON_ID: seasonId ? Number(seasonId) : null,
        SEASON_END_BLOCK: seasonEndBlockOnchain ? Number(seasonEndBlockOnchain) : null,
      },
    },
    generatedAt: new Date().toISOString(),
  };
}
