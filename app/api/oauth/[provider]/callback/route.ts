import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig, Provider } from "@/lib/oauth-config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (provider !== "supabase" && provider !== "github") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const config = getOAuthConfig(provider as Provider);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 }
    );
  }

  // Verify state
  const storedState = request.cookies.get(
    `${config.cookiePrefix}oauth_state`
  )?.value;

  if (!storedState || state !== storedState) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  // Prepare token exchange request
  const tokenParams = new URLSearchParams();
  tokenParams.set("grant_type", "authorization_code");
  tokenParams.set("code", code);
  tokenParams.set("redirect_uri", config.redirectUri);

  // Add PKCE code verifier if required
  if (config.usePKCE) {
    const codeVerifier = request.cookies.get(
      `${config.cookiePrefix}code_verifier`
    )?.value;

    if (!codeVerifier) {
      return NextResponse.json(
        { error: "Missing code verifier" },
        { status: 400 }
      );
    }

    tokenParams.set("code_verifier", codeVerifier);
  }

  // Exchange code for token
  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Different providers handle authentication differently
  if (provider === "supabase") {
    headers.Authorization = `Basic ${btoa(
      `${config.clientId}:${config.clientSecret}`
    )}`;
  } else if (provider === "github") {
    headers.Accept = "application/json";
    tokenParams.set("client_id", config.clientId);
    tokenParams.set("client_secret", config.clientSecret);
  }

  const tokenResponse = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers,
    body: tokenParams,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Token exchange failed:", errorText);
    return NextResponse.json(
      { error: "Failed to exchange code for token" },
      { status: 400 }
    );
  }

  const tokenData = await tokenResponse.json();

  // Redirect to success page
  const successUrl = new URL(`/oauth/${provider}/success`, request.url);
  const res = NextResponse.redirect(successUrl);

  // Store tokens in cookies
  res.cookies.set(
    `${config.cookiePrefix}access_token`,
    tokenData.access_token,
    {
      httpOnly: true,
      secure: true,
    }
  );

  if (tokenData.refresh_token) {
    res.cookies.set(
      `${config.cookiePrefix}refresh_token`,
      tokenData.refresh_token,
      {
        httpOnly: true,
        secure: true,
      }
    );
  }

  // Clear temporary cookies
  res.cookies.delete(`${config.cookiePrefix}oauth_state`);
  if (config.usePKCE) {
    res.cookies.delete(`${config.cookiePrefix}code_verifier`);
  }

  return res;
}
