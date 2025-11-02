"server-only";
import * as oauth from "oauth4webapi";

export type Provider = "supabase" | "github" | "clerk" | "google";

export const VALID_PROVIDERS = [
  "supabase",
  "github",
  "clerk",
  "google",
] as const;

export function isValidProvider(provider: string): provider is Provider {
  return VALID_PROVIDERS.includes(provider as Provider);
}

/**
 * Extended configuration for provider-specific settings
 */
interface ProviderConfig {
  redirectUri: string;
  scope?: string;
  usePKCE: boolean;
  cookiePrefix: string;
  userInfoEndpoint?: string;
}

/**
 * Get oauth4webapi Client configuration
 */
export function getClient(provider: Provider): oauth.Client {
  switch (provider) {
    case "supabase":
      return {
        client_id: process.env.SUPABASE_CLIENT_ID!,
        client_secret: process.env.SUPABASE_CLIENT_SECRET!,
        token_endpoint_auth_method: "client_secret_basic",
      };
    case "github":
      return {
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        token_endpoint_auth_method: "client_secret_post",
      };
    case "clerk":
      return {
        client_id: process.env.CLERK_CLIENT_ID!,
        client_secret: process.env.CLERK_CLIENT_SECRET!,
        token_endpoint_auth_method: "client_secret_basic",
      };
    case "google":
      return {
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        token_endpoint_auth_method: "client_secret_post",
      };
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Get oauth4webapi AuthorizationServer configuration
 */
export function getAuthorizationServer(
  provider: Provider
): oauth.AuthorizationServer {
  switch (provider) {
    case "supabase":
      return {
        issuer: process.env.SUPABASE_OAUTH_ISSUER!,
        authorization_endpoint:
          process.env.SUPABASE_OAUTH_AUTHORIZATION_ENDPOINT!,
        token_endpoint: process.env.SUPABASE_OAUTH_TOKEN_ENDPOINT!,
      };
    case "github":
      return {
        issuer: process.env.GITHUB_OAUTH_ISSUER!,
        authorization_endpoint:
          process.env.GITHUB_OAUTH_AUTHORIZATION_ENDPOINT!,
        token_endpoint: process.env.GITHUB_OAUTH_TOKEN_ENDPOINT!,
      };
    case "clerk":
      return {
        issuer: process.env.CLERK_OAUTH_ISSUER!,
        authorization_endpoint: process.env.CLERK_OAUTH_AUTHORIZATION_ENDPOINT!,
        token_endpoint: process.env.CLERK_OAUTH_TOKEN_ENDPOINT!,
        userinfo_endpoint: process.env.CLERK_OAUTH_USERINFO_ENDPOINT,
      };
    case "google":
      return {
        issuer: process.env.GOOGLE_OAUTH_ISSUER!,
        authorization_endpoint:
          process.env.GOOGLE_OAUTH_AUTHORIZATION_ENDPOINT!,
        token_endpoint: process.env.GOOGLE_OAUTH_TOKEN_ENDPOINT!,
        userinfo_endpoint: process.env.GOOGLE_OAUTH_USERINFO_ENDPOINT,
      };
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Get provider-specific configuration
 */
export function getProviderConfig(provider: Provider): ProviderConfig {
  switch (provider) {
    case "supabase":
      return {
        redirectUri: process.env.SUPABASE_REDIRECT_URI!,
        usePKCE: true,
        cookiePrefix: "supabase_",
        userInfoEndpoint: "https://api.supabase.com/v1/oauth/userinfo",
      };
    case "github":
      return {
        redirectUri: process.env.GITHUB_REDIRECT_URI!,
        scope: "read:user read:org",
        usePKCE: false,
        cookiePrefix: "github_",
        userInfoEndpoint: "https://api.github.com/user",
      };
    case "clerk":
      return {
        redirectUri: process.env.CLERK_REDIRECT_URI!,
        scope: "email profile",
        usePKCE: true,
        cookiePrefix: "clerk_",
      };
    case "google":
      return {
        redirectUri: process.env.GOOGLE_REDIRECT_URI!,
        scope: "openid email profile",
        usePKCE: true,
        cookiePrefix: "google_",
      };
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Utility functions using oauth4webapi
 */
export function generateState(): string {
  return oauth.generateRandomState();
}

export function generateCodeVerifier(): string {
  return oauth.generateRandomCodeVerifier();
}

export async function calculateCodeChallenge(
  codeVerifier: string
): Promise<string> {
  return oauth.calculatePKCECodeChallenge(codeVerifier);
}
