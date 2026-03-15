import { getUsername } from "~/.server/db/username";

export async function getUserDisplayName(
  user: string | null,
): Promise<string | null> {
  if (!user) return null;
  return (await getUsername(user)) ?? user;
}
