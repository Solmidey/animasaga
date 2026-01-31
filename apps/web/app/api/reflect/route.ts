// apps/web/app/api/reflect/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress, getAddress, type Abi, type Address } from "viem";
import { base } from "viem/chains";
import { BASE_MAINNET, DEPLOYMENTS } from "@/lib/constants";

export const runtime = "nodejs";
export const revalidate = 10;

const SagaRegistryReadAbi = [
  {
    type: "function",
    name: "hasChosen",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isLocked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

const SagaRegistryRegisterAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const satisfies Abi;

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

function looksLikeAlreadyRegistered(msg: string) {
  const s = msg.toLowerCase();
  return (
    s.includes("already") ||
    s.includes("registered") ||
    s.includes("exists") ||
    s.includes("duplicate") ||
    s.includes("has chosen") ||
    s.includes("chosen")
  );
}

// client typed as any intentionally to avoid viem-version type conflicts in TS
async function detectRegistered(client: any, user: Address) {
  const saga = getAddress(DEPLOYMENTS.SagaRegistry.address as Address);

  // 1) hasChosen(user)
  try {
    const v = await client.readContract({
      address: saga,
      abi: SagaRegistryReadAbi,
      functionName: "hasChosen",
      args: [user],
    });
    return { registered: Boolean(v), source: "hasChosen", raw: v };
  } catch {}

  // 2) registry(user) candidates
  for (let i = 0; i < SagaRegistryRegistryCandidates.length; i++) {
    const abi = SagaRegistryRegistryCandidates[i];
    try {
      const v: any = await client.readContract({
        address: saga,
        abi,
        functionName: "registry",
        args: [user],
      });

      if (typeof v === "boolean") return { registered: v, source: `registry#${i}`, raw: v };
      if (Array.isArray(v) && typeof v[0] === "boolean")
        return { registered: Boolean(v[0]), source: `registry#${i}`, raw: v };

      // If it returns something but not interpretable
      return { registered: false, source: `registry#${i}-unknown`, raw: v };
    } catch {}
  }

  // 3) FINAL fallback: simulate register()
  // If it reverts "already registered", we mark registered=true.
  try {
    await client.simulateContract({
      address: saga,
      abi: SagaRegistryRegisterAbi,
      functionName: "register",
      account: user,
      args: [],
    });
    // Simulation succeeded -> likely NOT registered (or register is idempotent)
    return { registered: false, source: "simulate-register:ok", raw: null };
  } catch (e: any) {
    const msg = String(e?.shortMessage || e?.message || "");
    if (looksLikeAlreadyRegistered(msg)) {
      return { registered: true, source: "simulate-register:already", raw: msg };
    }
    // Some other failure (locked, etc). Don’t assume registered.
    return { registered: false, source: "simulate-register:revert-other", raw: msg };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addressParam = url.searchParams.get("address") ?? "";

  if (!addressParam || !isAddress(addressParam)) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  const user = getAddress(addressParam as Address);

  const rpc =
    process.env.RPC_URL_BASE_MAINNET ||
    process.env.BASE_RPC_URL ||
    BASE_MAINNET.rpcUrl ||
    "https://base-rpc.publicnode.com";

  const client = createPublicClient({
    chain: base,
    transport: http(rpc, { batch: true }),
  });

  // --- SagaRegistry
  const reg = await detectRegistered(client as any, user);

  let isLocked: boolean | null = null;
  try {
    isLocked = await (client as any).readContract({
      address: getAddress(DEPLOYMENTS.SagaRegistry.address as Address),
      abi: SagaRegistryReadAbi,
      functionName: "isLocked",
      args: [],
    });
  } catch {
    isLocked = null;
  }

  // --- ElyndraCommitment
  let hasChosen = false;
  let factionId: number | null = null;
  let commitmentHash: string = "0x" + "0".repeat(64);

  try {
    hasChosen = await (client as any).readContract({
      address: getAddress(DEPLOYMENTS.ElyndraCommitment.address as Address),
      abi: ElyndraCommitmentAbi,
      functionName: "hasChosen",
      args: [user],
    });
  } catch {
    hasChosen = false;
  }

  // IMPORTANT: only treat faction as meaningful if hasChosen === true
  if (hasChosen) {
    try {
      const id = await (client as any).readContract({
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
      const h = await (client as any).readContract({
        address: getAddress(DEPLOYMENTS.ElyndraCommitment.address as Address),
        abi: ElyndraCommitmentAbi,
        functionName: "commitments",
        args: [user],
      });
      commitmentHash = String(h);
    } catch {
      commitmentHash = "0x" + "0".repeat(64);
    }
  }

  return NextResponse.json({
    address: user,
    registry: {
      registered: reg.registered,
      isLocked,
      contract: DEPLOYMENTS.SagaRegistry.address,
      // debug so we can confirm what worked
      source: reg.source,
      raw: reg.raw,
    },
    elyndra: {
      hasChosen,
      factionOf: factionId,
      factionName: hasChosen ? factionNameFromId(factionId) : "Unknown",
      commitmentHash,
      commitmentBlock: 0,
      contract: DEPLOYMENTS.ElyndraCommitment.address,
    },
    generatedAt: new Date().toISOString(),
  });
}
