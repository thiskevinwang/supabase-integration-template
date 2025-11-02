import * as oauth from "oauth4webapi";
import {
  getClient,
  getAuthorizationServer,
  getProviderConfig,
  Provider,
} from "./oauth-config";

/**
 * Generic user info structure
 * Keep this for convenience as oauth4webapi's UserInfoResponse is generic
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
 * OAuth Client for interacting with OAuth providers using oauth4webapi
 */
export class OAuthClient {
  private provider: Provider;
  private accessToken: string;
  private client: oauth.Client;
  private authorizationServer: oauth.AuthorizationServer;

  constructor(provider: Provider, accessToken: string) {
    this.provider = provider;
    this.accessToken = accessToken;
    this.client = getClient(provider);
    this.authorizationServer = getAuthorizationServer(provider);
  }

  /**
   * Get user information from the provider using oauth4webapi
   */
  async getUserInfo(): Promise<UserInfo> {
    try {
      const providerConfig = getProviderConfig(this.provider);

      // For providers with standard userinfo endpoint
      if (this.authorizationServer.userinfo_endpoint) {
        const response = await oauth.userInfoRequest(
          this.authorizationServer,
          this.client,
          this.accessToken
        );

        const userInfoResponse = await oauth.processUserInfoResponse(
          this.authorizationServer,
          this.client,
          oauth.skipSubjectCheck, // Skip subject verification
          response
        );

        return this.normalizeUserInfo(userInfoResponse);
      }

      // Fallback for providers without standard userinfo endpoint (e.g., GitHub)
      if (providerConfig.userInfoEndpoint) {
        const headers: HeadersInit = {
          Authorization: `Bearer ${this.accessToken}`,
          Accept:
            this.provider === "github"
              ? "application/vnd.github+json"
              : "application/json",
        };

        const response = await fetch(providerConfig.userInfoEndpoint, {
          headers,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch user info: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        return this.normalizeUserInfo(data);
      }

      throw new Error(`No userinfo endpoint configured for ${this.provider}`);
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
   * Refresh the access token using a refresh token with oauth4webapi
   */
  static async refreshAccessToken(
    provider: Provider,
    refreshToken: string
  ): Promise<oauth.TokenEndpointResponse> {
    const client = getClient(provider);
    const authorizationServer = getAuthorizationServer(provider);

    try {
      // Determine client authentication method
      const clientSecret = String(client.client_secret);
      const clientAuth =
        client.token_endpoint_auth_method === "client_secret_post"
          ? oauth.ClientSecretPost(clientSecret)
          : oauth.ClientSecretBasic(clientSecret);

      // Use oauth4webapi's refreshTokenGrantRequest
      const response = await oauth.refreshTokenGrantRequest(
        authorizationServer,
        client,
        clientAuth,
        refreshToken
      );

      // Process the response
      const result = await oauth.processRefreshTokenResponse(
        authorizationServer,
        client,
        response
      );

      return result;
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
