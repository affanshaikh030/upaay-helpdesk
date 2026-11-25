// Better Auth builds its links, cookie settings and origin checks from the server's public address. If it is missing in
// production it guesses it from request headers, which a deployment must never rely on, so the server refuses to start
// without it. Development and tests may leave it unset, as before
export function requireBaseUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  const url = env.BETTER_AUTH_URL;
  if (env.NODE_ENV === "production" && !url?.trim()) {
    throw new Error("BETTER_AUTH_URL must be set in production (the public https origin of this server, e.g. https://helpdesk.example.com)");
  }
  return url;
}
