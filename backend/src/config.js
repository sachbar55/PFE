export const config = {
  port: Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 3000),
  tokenSecret: process.env.AUTH_TOKEN_SECRET ?? "change-me-in-production",
  tokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS ?? 60 * 60 * 8)
};
