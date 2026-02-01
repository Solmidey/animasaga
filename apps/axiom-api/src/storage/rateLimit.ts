export async function rateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const k = `rl:${key}`;
  const raw = await kv.get(k);
  const count = raw ? Number(raw) : 0;

  if (Number.isFinite(count) && count >= limit) return true;

  const next = (Number.isFinite(count) ? count : 0) + 1;
  await kv.put(k, String(next), { expirationTtl: windowSeconds });
  return false;
}
