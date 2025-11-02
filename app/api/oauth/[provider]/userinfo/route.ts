import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuthClient } from "@/lib/oauth-client";
import { Provider, isValidProvider } from "@/lib/oauth-config";

/**
 * GET /api/oauth/[provider]/userinfo
 * Fetch user information for the authenticated provider
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

    // Create OAuth client and fetch user info
    const client = new OAuthClient(provider as Provider, accessToken);
    const userInfo = await client.getUserInfo();

    return NextResponse.json(userInfo);
  } catch (error) {
    console.error(`Error fetching user info for ${provider}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch user information" },
      { status: 500 }
    );
  }
}
