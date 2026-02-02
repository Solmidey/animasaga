import { NextRequest, NextResponse } from "next/server";
import { base } from "viem/chains";
import { createPublicClient, getAddress, http, type Abi, getAbiItem } from "viem";

import WitnessRegistryAbiRaw from "@/lib/abi/WitnessRegistry.json";
import { BASE_MAINNET, DEPLOYMENTS, WITNESS_SEASON_ID } from "@/lib/constants";

export const runtime = "nodejs";
export const revalidate = 10;

const abi = WitnessRegistryAbiRaw as Abi;

type WitnessedLog = {
  args?: Record<string, any>;
  blockNumber?: bigint;
  transactionHash?: `0x${string}`;
  logIndex?: number;
};

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await sleep(150 * (i + 1));
    }
  }
  throw last;
}

export async function GET(req: NextRequest) {
  const addr = req.nextUrl.searchParams.get("address") ?? "";
  if (!addr || addr.length < 10) {
    return NextResponse.json({ error: "Missing address." }, { status: 400 });
  }

  let user: `0x${string}`;
  try {
    user = getAddress(addr) as `0x${string}`;
  } catch {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  const witness = DEPLOYMENTS.WitnessRegistry?.address;
  if (!witness || witness.length < 10) {
    return NextResponse.json({ error: "WitnessRegistry not configured." }, { status: 500 });
  }

  const deploymentBlock = Number(DEPLOYMENTS.WitnessRegistry.deploymentBlock ?? 0);
  const seasonId = Number(WITNESS_SEASON_ID ?? 1);

  const client = createPublicClient({
    chain: base,
    transport: http(BASE_MAINNET.rpcUrl, { batch: true }),
  });

  // We rely on the Witnessed event (fast + doesn't require a view fn).
  // Event name must exist in your ABI.
  const event = getAbiItem({ abi, name: "Witnessed" });

  const toBlock = Number(await withRetry(() => client.getBlockNumber(), 3));
  const floor = Math.max(deploymentBlock, 0);

  // Expanding windows to avoid timeouts.
  const WINDOWS = [40_000, 120_000, 300_000, 900_000];

  let witnessed = false;

  for (const LOOKBACK of WINDOWS) {
    const fromBlock = Math.max(floor, toBlock - LOOKBACK);

    try {
      const logs = await withRetry(
        () =>
          client.getLogs({
            address: getAddress(witness) as `0x${string}`,
            event: event as any,
            // filter by indexed "user" if it is indexed in the event ABI
            args: { user } as any,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
          }),
        3
      );

      if (!logs || logs.length === 0) continue;

      // Confirm matching seasonId in args (handles cases where user is indexed but season isn't)
      for (const l of logs as unknown as WitnessedLog[]) {
        const a = l.args ?? {};
        const seasonRaw = a.seasonId ?? a[1];
        const season = typeof seasonRaw === "bigint" ? Number(seasonRaw) : Number(seasonRaw ?? -1);
        if (season === seasonId) {
          witnessed = true;
          break;
        }
      }

      if (witnessed) break;
    } catch {
      continue;
    }
  }

  return NextResponse.json({
    ok: true,
    address: user,
    seasonId,
    witnessed,
    checkedAt: new Date().toISOString(),
  });
}
