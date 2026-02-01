const API = "https://discord.com/api/v10";

export async function discordAddRole(args: {
  botToken: string;
  guildId: string;
  userId: string;
  roleId: string;
}) {
  const url = `${API}/guilds/${args.guildId}/members/${args.userId}/roles/${args.roleId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${args.botToken}`,
    },
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text().catch(() => "");
    throw new Error(`discordAddRole failed ${res.status}: ${t}`);
  }
}

export async function discordRemoveRole(args: {
  botToken: string;
  guildId: string;
  userId: string;
  roleId: string;
}) {
  const url = `${API}/guilds/${args.guildId}/members/${args.userId}/roles/${args.roleId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bot ${args.botToken}`,
    },
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text().catch(() => "");
    throw new Error(`discordRemoveRole failed ${res.status}: ${t}`);
  }
}
