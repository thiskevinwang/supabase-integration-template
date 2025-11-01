import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuthClient } from "@/lib/oauth-client";
import { Provider, getOAuthConfig } from "@/lib/oauth-config";

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
  if (provider !== "supabase" && provider !== "github") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  try {
    const config = getOAuthConfig(provider as Provider);
    const cookieStore = await cookies();

    // Get refresh token from cookies
    const refreshToken = cookieStore.get(
      `${config.cookiePrefix}refresh_token`
    )?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token available" },
        { status: 401 }
      );
    }

    // Refresh the access token
    const newTokenData = await OAuthClient.refreshAccessToken(
      provider as Provider,
      refreshToken
    );

    // Update cookies with new tokens
    const response = NextResponse.json({
      success: true,
      message: "Token refreshed successfully",
    });

    response.cookies.set(
      `${config.cookiePrefix}access_token`,
      newTokenData.access_token,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: newTokenData.expires_in || 3600,
      }
    );

    // Update refresh token if a new one was provided
    if (newTokenData.refresh_token) {
      response.cookies.set(
        `${config.cookiePrefix}refresh_token`,
        newTokenData.refresh_token,
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
