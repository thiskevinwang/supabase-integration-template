/**
 * OAuth Client Usage Examples
 *
 * This file demonstrates various ways to use the OAuth client library.
 * These examples can be used in API routes, server components, or server actions.
 */

import { OAuthClient, createOAuthClientFromToken } from "@/lib/oauth-client";
import { Provider } from "@/lib/oauth-config";

/**
 * Example 1: Basic User Info Fetch
 */
export async function example1_fetchUserInfo(
  provider: Provider,
  accessToken: string
) {
  const client = new OAuthClient(provider, accessToken);
  const userInfo = await client.getUserInfo();

  console.log("User Info:", {
    id: userInfo.id,
    username: userInfo.username,
    email: userInfo.email,
  });

  return userInfo;
}

/**
 * Example 2: Validate Token Before Use
 */
export async function example2_validateAndFetch(
  provider: Provider,
  accessToken: string
) {
  const client = new OAuthClient(provider, accessToken);

  // First, validate the token
  const isValid = await client.validateToken();

  if (!isValid) {
    throw new Error("Access token is invalid or expired");
  }

  // If valid, proceed with fetching data
  const userInfo = await client.getUserInfo();
  return userInfo;
}

/**
 * Example 3: Get Token Info (when available)
 */
export async function example3_getTokenInfo(
  provider: Provider,
  accessToken: string
) {
  const client = new OAuthClient(provider, accessToken);
  const tokenInfo = await client.getTokenInfo();

  if (tokenInfo) {
    console.log("Token Info:", {
      type: tokenInfo.token_type,
      expiresIn: tokenInfo.expires_in,
      scope: tokenInfo.scope,
    });
  } else {
    console.log("Token info not available for this provider");
  }

  return tokenInfo;
}

/**
 * Example 4: Refresh Access Token
 */
export async function example4_refreshToken(
  provider: Provider,
  refreshToken: string
) {
  const newTokenData = await OAuthClient.refreshAccessToken(
    provider,
    refreshToken
  );

  console.log("New access token obtained:", {
    tokenType: newTokenData.token_type,
    expiresIn: newTokenData.expires_in,
    hasRefreshToken: !!newTokenData.refresh_token,
  });

  return newTokenData;
}

/**
 * Example 5: Complete Token Refresh Workflow
 */
export async function example5_refreshWorkflow(
  provider: Provider,
  currentAccessToken: string,
  refreshToken: string
) {
  const client = new OAuthClient(provider, currentAccessToken);

  // Check if current token is valid
  const isValid = await client.validateToken();

  if (!isValid) {
    console.log("Token is invalid, refreshing...");

    // Refresh the token
    const newTokenData = await OAuthClient.refreshAccessToken(
      provider,
      refreshToken
    );

    // Return new token data for storage
    return {
      accessToken: newTokenData.access_token,
      refreshToken: newTokenData.refresh_token || refreshToken,
      needsUpdate: true,
    };
  }

  // Token is still valid
  return {
    accessToken: currentAccessToken,
    refreshToken: refreshToken,
    needsUpdate: false,
  };
}

/**
 * Example 6: Using the Helper Function
 */
export async function example6_helperFunction(
  provider: Provider,
  accessToken: string
) {
  // Alternative way to create client
  const client = createOAuthClientFromToken(provider, accessToken);
  const userInfo = await client.getUserInfo();

  return userInfo;
}

/**
 * Example 7: Error Handling Pattern
 */
export async function example7_errorHandling(
  provider: Provider,
  accessToken: string
) {
  try {
    const client = new OAuthClient(provider, accessToken);
    const userInfo = await client.getUserInfo();

    return {
      success: true,
      data: userInfo,
      error: null,
    };
  } catch (error) {
    console.error(`Failed to fetch user info for ${provider}:`, error);

    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Example 8: Fetch Multiple Data Points
 */
export async function example8_fetchMultiple(
  provider: Provider,
  accessToken: string
) {
  const client = new OAuthClient(provider, accessToken);

  // Fetch user info and token info in parallel
  const [userInfo, tokenInfo] = await Promise.all([
    client.getUserInfo(),
    client.getTokenInfo().catch(() => null), // Handle providers without token info
  ]);

  return {
    user: userInfo,
    token: tokenInfo,
  };
}

/**
 * Example 9: Provider-Specific Data Access
 */
export async function example9_providerSpecific(
  provider: Provider,
  accessToken: string
) {
  const client = new OAuthClient(provider, accessToken);
  const userInfo = await client.getUserInfo();

  // Access provider-specific data from the raw response
  if (provider === "github") {
    const githubData = userInfo.raw as {
      bio?: string;
      public_repos?: number;
      followers?: number;
    };

    return {
      ...userInfo,
      bio: githubData.bio,
      publicRepos: githubData.public_repos,
      followers: githubData.followers,
    };
  }

  return userInfo;
}

/**
 * Example 10: Token Validation with Auto-Refresh
 */
export async function example10_autoRefresh(
  provider: Provider,
  accessToken: string,
  refreshToken: string | undefined
) {
  const client = new OAuthClient(provider, accessToken);

  // Try to use the current token
  try {
    const userInfo = await client.getUserInfo();
    return {
      userInfo,
      newAccessToken: accessToken,
      wasRefreshed: false,
    };
  } catch (error) {
    // If failed and we have a refresh token, try to refresh
    if (refreshToken) {
      console.log("Access token failed, attempting refresh...");

      const newTokenData = await OAuthClient.refreshAccessToken(
        provider,
        refreshToken
      );

      // Try again with new token
      const newClient = new OAuthClient(provider, newTokenData.access_token);
      const userInfo = await newClient.getUserInfo();

      return {
        userInfo,
        newAccessToken: newTokenData.access_token,
        newRefreshToken: newTokenData.refresh_token,
        wasRefreshed: true,
      };
    }

    // No refresh token available, re-throw the error
    throw error;
  }
}

/**
 * Type-safe usage example
 */
export type OAuthResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

export async function example11_typeSafe(
  provider: Provider,
  accessToken: string
): Promise<OAuthResult<{ id: string; username: string }>> {
  try {
    const client = new OAuthClient(provider, accessToken);
    const userInfo = await client.getUserInfo();

    return {
      success: true,
      data: {
        id: userInfo.id,
        username: userInfo.username || "unknown",
      },
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
