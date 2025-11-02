import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuthClient } from "@/lib/oauth-client";
import {
  Provider,
  getProviderConfig,
  isValidProvider,
} from "@/lib/oauth-config";

/**
 * POST /api/oauth/[provider]/refresh
 * Refresh the access token for the authenticated provider
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  try {
    const providerConfig = getProviderConfig(provider as Provider);
    const cookieStore = await cookies();

    // Get refresh token from cookies
    const refreshToken = cookieStore.get(
      `${providerConfig.cookiePrefix}refresh_token`
    )?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token available" },
        { status: 401 }
      );
    }

    // Refresh the access token using oauth4webapi
    const tokenResponse = await OAuthClient.refreshAccessToken(
      provider as Provider,
      refreshToken
    );

    // Update cookies with new tokens
    const response = NextResponse.json({
      success: true,
      message: "Token refreshed successfully",
    });

    response.cookies.set(
      `${providerConfig.cookiePrefix}access_token`,
      tokenResponse.access_token,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: tokenResponse.expires_in || 3600,
      }
    );

    // Update refresh token if a new one was provided
    if (tokenResponse.refresh_token) {
      response.cookies.set(
        `${providerConfig.cookiePrefix}refresh_token`,
        tokenResponse.refresh_token,
        {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
        }
      );
    }

    return response;
  } catch (error) {
    console.error(`Error refreshing token for ${provider}:`, error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
