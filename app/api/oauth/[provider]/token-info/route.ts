import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuthClient } from "@/lib/oauth-client";
import { Provider } from "@/lib/oauth-config";

/**
 * GET /api/oauth/[provider]/token-info
 * Fetch token information for the authenticated provider
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (provider !== "supabase" && provider !== "github") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  try {
    // Get access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(
      provider === "supabase" ? "supabase_access_token" : "github_access_token"
    )?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Not authenticated with this provider" },
        { status: 401 }
      );
    }

    // Create OAuth client and fetch token info
    const client = new OAuthClient(provider as Provider, accessToken);
    const tokenInfo = await client.getTokenInfo();

    if (!tokenInfo) {
      return NextResponse.json(
        { error: "Token info not available for this provider" },
        { status: 404 }
      );
    }

    return NextResponse.json(tokenInfo);
  } catch (error) {
    console.error(`Error fetching token info for ${provider}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch token information" },
      { status: 500 }
    );
  }
}
