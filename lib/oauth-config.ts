import * as oauth from "oauth4webapi";

export type Provider = "supabase" | "github";

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** OIDC Discovery */
  oidcDiscoveryEndpoint?: string;
  /** OAuth 2.0 Authorization Server Metadata (RFC 8414) */
  authorizationServerMetadataEndpoint?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scope?: string;
  usePKCE: boolean;
  cookiePrefix: string;
}

export function getOAuthConfig(provider: Provider): OAuthConfig {
  switch (provider) {
    case "supabase":
      return {
        clientId: process.env.SUPABASE_CLIENT_ID!,
        clientSecret: process.env.SUPABASE_CLIENT_SECRET!,
        redirectUri: process.env.SUPABASE_REDIRECT_URI!,
        authorizationServerMetadataEndpoint:
          "https://api.supabase.com/.well-known/oauth-authorization-server",
        authorizationEndpoint: "https://api.supabase.com/v1/oauth/authorize",
        tokenEndpoint: "https://api.supabase.com/v1/oauth/token",
        usePKCE: true,
        cookiePrefix: "supabase_",
      };
    case "github":
      return {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        redirectUri: process.env.GITHUB_REDIRECT_URI!,
        authorizationServerMetadataEndpoint:
          "https://github.com/.well-known/oauth-authorization-server",
        authorizationEndpoint: "https://github.com/login/oauth/authorize",
        tokenEndpoint: "https://github.com/login/oauth/access_token",
        scope: "read:user read:org",
        usePKCE: false,
        cookiePrefix: "github_",
      };
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export function generateState(): string {
  return oauth.generateRandomState();
}

export async function generatePKCE() {
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}
