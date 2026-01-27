import { createPublicClient, http, type Abi, type Address } from "viem";
import { base } from "viem/chains";
import ElyndraCommitmentAbiRaw from "./abi/ElyndraCommitment.json";
import { BASE_MAINNET, DEPLOYMENTS } from "./constants";

const ElyndraCommitmentAbi = ElyndraCommitmentAbiRaw as Abi;

const client = createPublicClient({
  chain: base,
  transport: http(BASE_MAINNET.rpcUrl, { batch: true }),
});

export type ReflectSnapshot = {
  address: Address;
  elyndra: {
    hasChosen: boolean;
    factionOf: number | null;
    factionName: "Flame" | "Veil" | "Echo" | "Unknown";
    commitmentHash: string | null;
    commitmentBlock: number | null;
  };
  generatedAt: string;
};

function factionNameFromIndex(i: number | null): ReflectSnapshot["elyndra"]["factionName"] {
  if (i === 0) return "Flame";
  if (i === 1) return "Veil";
  if (i === 2) return "Echo";
  return "Unknown";
}

export async function getReflectSnapshot(address: Address): Promise<ReflectSnapshot> {
  const contract = DEPLOYMENTS.ElyndraCommitment.address as Address;

  const [hasChosen, factionOfRaw, commitment] = await Promise.all([
    client.readContract({
      address: contract,
      abi: ElyndraCommitmentAbi,
      functionName: "hasChosen",
      args: [address],
    }) as Promise<boolean>,

    client.readContract({
      address: contract,
      abi: ElyndraCommitmentAbi,
      functionName: "factionOf",
      args: [address],
    }) as Promise<bigint>,

    client.readContract({
      address: contract,
      abi: ElyndraCommitmentAbi,
      functionName: "commitments",
      args: [address],
    }) as Promise<any>,
  ]);

  let commitmentHash: string | null = null;
  let commitmentBlock: number | null = null;

  if (commitment) {
    if (Array.isArray(commitment)) {
      // Expected tuple: [sagaId, seasonId, commitmentHash, blockNumber]
      commitmentHash = commitment[2] ? String(commitment[2]) : null;
      commitmentBlock = commitment[3] != null ? Number(commitment[3]) : null;
    } else if (typeof commitment === "object") {
      commitmentHash = (commitment.commitmentHash ?? commitment[2] ?? null) as any;
      const b = commitment.blockNumber ?? commitment[3] ?? null;
      commitmentBlock = b != null ? Number(b) : null;
    }
  }

  const factionOf = hasChosen ? Number(factionOfRaw) : null;

  return {
    address,
    elyndra: {
      hasChosen,
      factionOf,
      factionName: factionNameFromIndex(factionOf),
      commitmentHash,
      commitmentBlock,
    },
    generatedAt: new Date().toISOString(),
  };
}
