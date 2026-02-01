import { createPublicClient, http, getAddress, type Address, getAbiItem } from "viem";
import { base } from "viem/chains";

// Minimal ABI fragments (we only read what we need)
const ELYNDRA_COMMITMENT_ABI = [
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
] as const;

// Witnessed event (adjust if your event signature differs)
const WITNESS_EVENT_ABI = [
  {
    type: "event",
    name: "Witnessed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "seasonId", type: "uint256", indexed: true },
      { name: "faction", type: "uint8", indexed: false },
      { name: "proof", type: "bytes32", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export async function readAlignment(args: {
  rpcUrl: string;
  commitmentAddress: string;
  user: string;
}) {
  const client: any = createPublicClient({ chain: base, transport: http(args.rpcUrl, { batch: true }) });

  const addr = getAddress(args.commitmentAddress as Address);
  const user = getAddress(args.user as Address);

  const hasChosen = (await client.readContract({
    address: addr,
    abi: ELYNDRA_COMMITMENT_ABI,
    functionName: "hasChosen",
    args: [user],
  })) as boolean;

  let faction = -1;
  if (hasChosen) {
    const f = await client.readContract({
      address: addr,
      abi: ELYNDRA_COMMITMENT_ABI,
      functionName: "factionOf",
      args: [user],
    });
    faction = Number(f);
  }

  return { hasChosen, faction };
}

/**
 * Read witness status via logs scanning (safe for MVP; caches result briefly).
 * Uses KV cache to avoid repeated log scans.
 */
export async function readWitnessed(args: {
  rpcUrl: string;
  witnessAddress: string;
  deploymentBlock: number;
  seasonId: number;
  user: string;
  cacheKv: KVNamespace;
}): Promise<boolean> {
  const user = getAddress(args.user as Address).toLowerCase();
  const cacheKey = `witnessed:${args.seasonId}:${user}`;

  const cached = await args.cacheKv.get(cacheKey);
  if (cached === "1") return true;
  if (cached === "0") return false;

  const client: any = createPublicClient({ chain: base, transport: http(args.rpcUrl, { batch: true }) });

  const contract = getAddress(args.witnessAddress as Address);
  const event = getAbiItem({ abi: WITNESS_EVENT_ABI as any, name: "Witnessed" });

  const toBlock = Number(await client.getBlockNumber());
  const floor = Math.max(args.deploymentBlock || 0, 0);

  // expanding windows (avoid timeouts)
  const WINDOWS = [50_000, 200_000, 600_000, 1_200_000];

  for (const lookback of WINDOWS) {
    const fromBlock = Math.max(floor, toBlock - lookback);
    try {
      const logs = await client.getLogs({
        address: contract,
        event,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
      });

      const ok =
        Array.isArray(logs) &&
        logs.some((l: any) => {
          const a = l.args ?? {};
          const u = (a.user ?? a[0]) as string | undefined;
          const s = a.seasonId ?? a[1];
          if (!u || s === undefined) return false;

          const uAddr = getAddress(u as Address).toLowerCase();
          const sid = typeof s === "bigint" ? Number(s) : Number(s);
          return uAddr === user && sid === args.seasonId;
        });

      // cache for 5 minutes
      await args.cacheKv.put(cacheKey, ok ? "1" : "0", { expirationTtl: 300 });
      return ok;
    } catch {
      continue;
    }
  }

  await args.cacheKv.put(cacheKey, "0", { expirationTtl: 120 });
  return false;
}
