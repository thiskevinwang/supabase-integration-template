import { NextResponse } from "next/server";
import {
  getOAuthConfig,
  generateState,
  generatePKCE,
  Provider,
} from "@/lib/oauth-config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (provider !== "supabase" && provider !== "github") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const config = getOAuthConfig(provider as Provider);
  const state = generateState();
  const authorizationUrl = new URL(config.authorizationEndpoint);

  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("state", state);

  if (config.scope) {
    authorizationUrl.searchParams.set("scope", config.scope);
  }

  // Handle PKCE if required
  let codeVerifier: string | undefined;
  if (config.usePKCE) {
    const pkce = await generatePKCE();
    codeVerifier = pkce.codeVerifier;
    authorizationUrl.searchParams.set("code_challenge", pkce.codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
  }

  const response = NextResponse.redirect(authorizationUrl);

  // Store state in cookies
  response.cookies.set(`${config.cookiePrefix}oauth_state`, state, {
    httpOnly: true,
    secure: true,
  });

  // Store PKCE code verifier if used
  if (codeVerifier) {
    response.cookies.set(`${config.cookiePrefix}code_verifier`, codeVerifier, {
      httpOnly: true,
      secure: true,
    });
  }

  return response;
}
