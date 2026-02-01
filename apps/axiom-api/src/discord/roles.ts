export const ROLES = {
  BEARER_FLAME: "1460530799676756030",
  BEARER_VEIL: "1460531430043156767",
  BEARER_ECHO: "1460531650109903013",
  BEARER_CROWN: "1460531822193676414",

  KAEL: "1460201480446414985",
  NYRA: "1460201918587605135",
  ERON: "1460202055607128243",
  SERIS: "1460203000659312844",

  EARLY_BELIEVER: "1460203762940641372",
} as const;

export function factionToBearerRoleId(faction: number): string | null {
  if (faction === 0) return ROLES.BEARER_FLAME;
  if (faction === 1) return ROLES.BEARER_VEIL;
  if (faction === 2) return ROLES.BEARER_ECHO;
  if (faction === 3) return ROLES.BEARER_CROWN;
  return null;
}
