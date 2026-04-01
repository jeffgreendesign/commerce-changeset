// TEMPORARY: Remove after debugging auth issue
export function GET() {
  const secret = process.env.AUTH0_SECRET;
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  const appBaseUrl = process.env.APP_BASE_URL;
  const vercelUrl = process.env.VERCEL_URL;

  return Response.json({
    AUTH0_SECRET: secret
      ? { exists: true, type: typeof secret, length: secret.length }
      : { exists: false },
    AUTH0_DOMAIN: domain
      ? { exists: true, value: domain }
      : { exists: false },
    AUTH0_CLIENT_ID: clientId
      ? { exists: true, length: clientId.length }
      : { exists: false },
    AUTH0_CLIENT_SECRET: clientSecret
      ? { exists: true, length: clientSecret.length }
      : { exists: false },
    APP_BASE_URL: appBaseUrl ?? null,
    VERCEL_URL: vercelUrl ?? null,
  });
}
