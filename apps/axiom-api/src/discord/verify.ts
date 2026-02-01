import nacl from "tweetnacl";

function hexToBytes(hex: string) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function verifyDiscordRequest(req: Request, discordPublicKeyHex: string): Promise<boolean> {
  try {
    const signature = req.headers.get("x-signature-ed25519") || "";
    const timestamp = req.headers.get("x-signature-timestamp") || "";
    if (!signature || !timestamp) return false;

    const bodyText = await req.clone().text();
    const message = new TextEncoder().encode(timestamp + bodyText);

    const sig = hexToBytes(signature);
    const pub = hexToBytes(discordPublicKeyHex);

    return nacl.sign.detached.verify(message, sig, pub);
  } catch {
    return false;
  }
}
