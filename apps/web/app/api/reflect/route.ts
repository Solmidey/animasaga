// apps/web/app/api/reflect/route.ts
import { NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  isAddress,
  getAddress,
  type Abi,
  type Address,
} from "viem";
import { base } from "viem/chains";
import { BASE_MAINNET, DEPLOYMENTS } from "@/lib/constants";

export const runtime = "nodejs";
export const revalidate = 10;

const SagaRegistryHasChosenAbi = [
  {
    type: "function",
    name: "hasChosen",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

const SagaRegistryIsLockedAbi = [
  {
    type: "function",
    name: "isLocked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

// We don't know your registry() struct shape for sure,
// so we try several common ones until one succeeds.
const SagaRegistryRegistryCandidates: Abi[] = [
  // registry(address) -> (bool)
  [
    {
      type: "function",
      name: "registry",
      stateMutability: "view",
      inputs: [{ name: "user", type: "address" }],
      outputs: [{ name: "", type: "bool" }],
    },
  ],
  // registry(address) -> (bool, uint8)
  [
    {
      type: "function",
      name: "registry",
      stateMutability: "view",
      inputs: [{ name: "user", type: "address" }],
      outputs: [
        { name: "", type: "bool" },
        { name: "", type: "uint8" },
      ],
    },
  ],
  // registry(address) -> (bool, uint8, uint32)
  [
    {
      type: "function",
      name: "registry",
      stateMutability: "view",
      inputs: [{ name: "user", type: "address" }],
      outputs: [
        { name: "", type: "bool" },
        { name: "", type: "uint8" },
        { name: "", type: "uint32" },
      ],
    },
  ],
  // registry(address) -> (bool, uint8, uint32, bytes32)
  [
    {
      type: "function",
      name: "registry",
      stateMutability: "view",
      inputs: [{ name: "user", type: "address" }],
      outputs: [
        { name: "", type: "bool" },
        { name: "", type: "uint8" },
        { name: "", type: "uint32" },
        { name: "", type: "bytes32" },
      ],
    },
  ],
];

const ElyndraCommitmentAbi = [
  {
    type: "function",
    name: "hasChosen",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "factionOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "commitments",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const satisfies Abi;

function factionNameFromId(id: number | null) {
  if (id === 0) return "Flame";
  if (id === 1) return "Veil";
  if (id === 2) return "Echo";
  return "Unknown";
}

async function tryReadRegistry(
  client: ReturnType<typeof createPublicClient>,
  user: Address
): Promise<{ registered: boolean; source: string; raw: any }> {
  const saga = getAddress(DEPLOYMENTS.SagaRegistry.address as Address);

  // 1) hasChosen(user)
  try {
    const v = await client.readContract({
      address: saga,
      abi: SagaRegistryHasChosenAbi,
      functionName: "hasChosen",
      args: [user],
    });
    return { registered: Boolean(v), source: "hasChosen", raw: v };
  } catch {
    // continue
  }

  // 2) registry(user) with multiple candidate struct shapes
  for (let i = 0; i < SagaRegistryRegistryCandidates.length; i++) {
    const abi = SagaRegistryRegistryCandidates[i];
    try {
      const v: any = await client.readContract({
        address: saga,
        abi,
        functionName: "registry",
        args: [user],
      });

      // Interpret:
      // - if bool returned directly -> use it
      // - if tuple/array and first item is bool -> use it
      if (typeof v === "boolean") return { registered: v, source: `registry#${i}`, raw: v };
      if (Array.isArray(v) && typeof v[0] === "boolean")
        return { registered: Boolean(v[0]), source: `registry#${i}`, raw: v };

      // If it returned something weird, treat as not enough info
      return { registered: false, source: `registry#${i}-unknown`, raw: v };
    } catch {
      // try next candidate
    }
  }

  return { registered: false, source: "none", raw: null };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addressParam = url.searchParams.get("address") ?? "";

  if (!addressParam || !isAddress(addressParam)) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  const user = getAddress(addressParam as Address);

  // IMPORTANT: ensure you are reading BASE MAINNET
  // If you accidentally set BASE_RPC_URL to Sepolia, remove it.
  const rpc =
    process.env.RPC_URL_BASE_MAINNET ||
    process.env.BASE_RPC_URL ||
    BASE_MAINNET.rpcUrl ||
    "https://base-rpc.publicnode.com";

  const client = createPublicClient({
    chain: base,
    transport: http(rpc, { batch: true }),
  });

  // --- SagaRegistry status
  const reg = await tryReadRegistry(client, user);

  let isLocked: boolean | null = null;
  try {
    isLocked = await client.readContract({
      address: getAddress(DEPLOYMENTS.SagaRegistry.address as Address),
      abi: SagaRegistryIsLockedAbi,
      functionName: "isLocked",
      args: [],
    });
  } catch {
    isLocked = null;
  }

  // --- ElyndraCommitment status
  let hasChosen = false;
  let factionId: number | null = null;
  let commitmentHash: string = "0x" + "0".repeat(64);

  try {
    hasChosen = await client.readContract({
      address: getAddress(DEPLOYMENTS.ElyndraCommitment.address as Address),
      abi: ElyndraCommitmentAbi,
      functionName: "hasChosen",
      args: [user],
    });
  } catch {
    hasChosen = false;
  }

  try {
    const id = await client.readContract({
      address: getAddress(DEPLOYMENTS.ElyndraCommitment.address as Address),
      abi: ElyndraCommitmentAbi,
      functionName: "factionOf",
      args: [user],
    });
    factionId = Number(id);
  } catch {
    factionId = null;
  }

  try {
    const h = await client.readContract({
      address: getAddress(DEPLOYMENTS.ElyndraCommitment.address as Address),
      abi: ElyndraCommitmentAbi,
      functionName: "commitments",
      args: [user],
    });
    commitmentHash = String(h);
  } catch {
    commitmentHash = "0x" + "0".repeat(64);
  }

  return NextResponse.json({
    address: user,
    registry: {
      registered: reg.registered,
      isLocked,
      contract: DEPLOYMENTS.SagaRegistry.address,
      // debug (helps you confirm what's being used)
      source: reg.source,
      raw: reg.raw,
    },
    elyndra: {
      hasChosen,
      factionOf: factionId,
      factionName: factionNameFromId(factionId),
      commitmentHash,
      commitmentBlock: 0,
      contract: DEPLOYMENTS.ElyndraCommitment.address,
    },
    generatedAt: new Date().toISOString(),
  });
}
