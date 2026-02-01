export async function kvGetText(kv: KVNamespace, key: string): Promise<string | null> {
  return await kv.get(key);
}

export async function kvPutText(kv: KVNamespace, key: string, value: string, ttlSeconds?: number) {
  await kv.put(key, value, ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
}

export async function kvDelete(kv: KVNamespace, key: string) {
  await kv.delete(key);
}

export async function kvGetJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvPutJson(kv: KVNamespace, key: string, value: unknown, ttlSeconds?: number) {
  const s = JSON.stringify(value);
  await kv.put(key, s, ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
}
