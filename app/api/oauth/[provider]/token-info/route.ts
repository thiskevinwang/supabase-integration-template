import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuthClient } from "@/lib/oauth-client";
import {
  Provider,
  isValidProvider,
  getProviderConfig,
} from "@/lib/oauth-config";

/**
 * GET /api/oauth/[provider]/token-info
 * Validate the access token for the authenticated provider
 * Note: This endpoint validates by attempting to fetch user info
 */
export async function GET(
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

    // Get access token from cookies
    const accessToken = cookieStore.get(
      `${providerConfig.cookiePrefix}access_token`
    )?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Not authenticated with this provider" },
        { status: 401 }
      );
    }

    // Create OAuth client and validate token
    const client = new OAuthClient(provider as Provider, accessToken);
    const isValid = await client.validateToken();

    return NextResponse.json({
      valid: isValid,
      provider,
      message: isValid ? "Token is valid" : "Token is invalid or expired",
    });
  } catch (error) {
    console.error(`Error validating token for ${provider}:`, error);
    return NextResponse.json(
      {
        valid: false,
        provider,
        error: "Failed to validate token",
      },
      { status: 500 }
    );
  }
}
