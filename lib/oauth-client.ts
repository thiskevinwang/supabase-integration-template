import { getOAuthConfig, Provider } from "./oauth-config";

/**
 * Token information response from OAuth provider
 */
export interface TokenInfo {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Generic user info structure
 */
export interface UserInfo {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  avatar_url?: string;
  raw: Record<string, unknown>; // Original provider response
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Provider-specific endpoint configurations
 */
interface ProviderEndpoints {
  tokenInfo?: string;
  userInfo: string;
  refreshToken: string;
}

const PROVIDER_ENDPOINTS: Record<Provider, ProviderEndpoints> = {
  supabase: {
    tokenInfo: "https://api.supabase.com/v1/oauth/token/info",
    userInfo: "https://api.supabase.com/v1/oauth/userinfo",
    refreshToken: "https://api.supabase.com/v1/oauth/token",
  },
  github: {
    userInfo: "https://api.github.com/user",
    refreshToken: "https://github.com/login/oauth/access_token",
  },
};

/**
 * OAuth Client for interacting with OAuth providers
 */
export class OAuthClient {
  private provider: Provider;
  private accessToken: string;

  constructor(provider: Provider, accessToken: string) {
    this.provider = provider;
    this.accessToken = accessToken;
  }

  /**
   * Get token information from the provider
   * Note: Not all providers support this endpoint (e.g., GitHub doesn't have a standard token info endpoint)
   */
  async getTokenInfo(): Promise<TokenInfo | null> {
    const endpoint = PROVIDER_ENDPOINTS[this.provider].tokenInfo;

    if (!endpoint) {
      console.warn(
        `Token info endpoint not available for provider: ${this.provider}`
      );
      return null;
    }

    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch token info: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching token info for ${this.provider}:`, error);
      throw error;
    }
  }

  /**
   * Get user information from the provider
   */
  async getUserInfo(): Promise<UserInfo> {
    const endpoint = PROVIDER_ENDPOINTS[this.provider].userInfo;

    try {
      const headers: HeadersInit = {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      };

      // GitHub requires specific Accept header
      if (this.provider === "github") {
        headers.Accept = "application/vnd.github+json";
      }

      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch user info: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return this.normalizeUserInfo(data);
    } catch (error) {
      console.error(`Error fetching user info for ${this.provider}:`, error);
      throw error;
    }
  }

  /**
   * Normalize user info across different providers
   */
  private normalizeUserInfo(data: Record<string, unknown>): UserInfo {
    // Helper to safely extract string values
    const getString = (value: unknown): string | undefined =>
      typeof value === "string" ? value : undefined;

    switch (this.provider) {
      case "supabase":
        return {
          id: getString(data.sub) || getString(data.id) || "",
          email: getString(data.email),
          name: getString(data.name),
          username:
            getString(data.preferred_username) || getString(data.username),
          avatar_url: getString(data.picture) || getString(data.avatar_url),
          raw: data,
        };

      case "github":
        return {
          id: String(data.id),
          email: getString(data.email),
          name: getString(data.name),
          username: getString(data.login),
          avatar_url: getString(data.avatar_url),
          raw: data,
        };

      default:
        return {
          id: String(data.id || data.sub || ""),
          email: getString(data.email),
          name: getString(data.name),
          username:
            getString(data.username) ||
            getString(data.login) ||
            getString(data.preferred_username),
          avatar_url: getString(data.avatar_url) || getString(data.picture),
          raw: data,
        };
    }
  }

  /**
   * Refresh the access token using a refresh token
   */
  static async refreshAccessToken(
    provider: Provider,
    refreshToken: string
  ): Promise<RefreshTokenResponse> {
    const config = getOAuthConfig(provider);
    const endpoint = PROVIDER_ENDPOINTS[provider].refreshToken;

    try {
      const params = new URLSearchParams();
      params.set("grant_type", "refresh_token");
      params.set("refresh_token", refreshToken);

      const headers: HeadersInit = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      // Provider-specific authentication
      if (provider === "supabase") {
        headers.Authorization = `Basic ${btoa(
          `${config.clientId}:${config.clientSecret}`
        )}`;
      } else if (provider === "github") {
        headers.Accept = "application/json";
        params.set("client_id", config.clientId);
        params.set("client_secret", config.clientSecret);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to refresh token: ${response.status} ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`Error refreshing token for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Validate if the current access token is still valid
   * Returns true if valid, false if invalid/expired
   */
  async validateToken(): Promise<boolean> {
    try {
      // Try to fetch user info as a way to validate the token
      await this.getUserInfo();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if token is expired based on token info
   * Returns null if expiry info is not available
   */
  async isTokenExpired(): Promise<boolean | null> {
    const tokenInfo = await this.getTokenInfo();

    if (!tokenInfo || !tokenInfo.expires_in) {
      return null;
    }

    // expires_in is in seconds from when the token was issued
    // This is a simplistic check - in production, you'd want to track
    // when the token was issued and calculate from that
    return false; // Would need additional logic to track issue time
  }
}

/**
 * Helper function to create an OAuth client from cookies
 */
export function createOAuthClientFromToken(
  provider: Provider,
  accessToken: string
): OAuthClient {
  return new OAuthClient(provider, accessToken);
}

/**
 * Utility to get provider-specific additional data
 */
export async function getProviderSpecificData(
  provider: Provider,
  accessToken: string
): Promise<unknown> {
  switch (provider) {
    case "github": {
      // Fetch organizations for GitHub
      const response = await fetch("https://api.github.com/user/orgs", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch GitHub organizations");
      }

      return await response.json();
    }

    case "supabase": {
      // Use the Supabase Management API
      const { SupabaseManagementAPI } = await import("supabase-management-js");
      const supabaseClient = new SupabaseManagementAPI({ accessToken });
      return await supabaseClient.getOrganizations();
    }

    default:
      return null;
  }
}
