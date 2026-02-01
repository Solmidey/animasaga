import { getAddress, isAddress, verifyMessage } from "viem";

export function buildLinkMessage(args: {
  discordUserId: string;
  nonce: string;
  issuedAt: string;
}) {
  return (
    `AnimaSaga / Axiom Link Rite\n` +
    `DiscordUserId: ${args.discordUserId}\n` +
    `Nonce: ${args.nonce}\n` +
    `IssuedAt: ${args.issuedAt}\n` +
    `Purpose: Link this wallet to this Discord identity.`
  );
}

export async function verifyWalletSignature(args: {
  discordUserId: string;
  nonce: string;
  issuedAt: string;
  address: string;
  signature: string;
}): Promise<boolean> {
  if (!isAddress(args.address)) return false;

  const address = getAddress(args.address);
  const message = buildLinkMessage({
    discordUserId: args.discordUserId,
    nonce: args.nonce,
    issuedAt: args.issuedAt,
  });

  try {
    return await verifyMessage({
      address,
      message,
      signature: args.signature as any,
    });
  } catch {
    return false;
  }
}
