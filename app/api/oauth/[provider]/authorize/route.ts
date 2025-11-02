import { NextResponse } from "next/server";
import {
  getClient,
  getAuthorizationServer,
  getProviderConfig,
  generateState,
  generateCodeVerifier,
  calculateCodeChallenge,
  Provider,
  isValidProvider,
} from "@/lib/oauth-config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const client = getClient(provider as Provider);
  const authorizationServer = getAuthorizationServer(provider as Provider);
  const providerConfig = getProviderConfig(provider as Provider);

  const state = generateState();
  const authorizationUrl = new URL(authorizationServer.authorization_endpoint!);

  const params_map = new URLSearchParams();
  params_map.set("client_id", client.client_id);
  params_map.set("redirect_uri", providerConfig.redirectUri);
  params_map.set("response_type", "code");
  params_map.set("state", state);

  if (providerConfig.scope) {
    params_map.set("scope", providerConfig.scope);
  }

  // Handle PKCE if required
  let codeVerifier: string | undefined;
  if (providerConfig.usePKCE) {
    codeVerifier = generateCodeVerifier();
    const codeChallenge = await calculateCodeChallenge(codeVerifier);
    params_map.set("code_challenge", codeChallenge);
    params_map.set("code_challenge_method", "S256");
  }

  authorizationUrl.search = params_map.toString();

  console.log("Redirecting to authorization URL:", authorizationUrl.toString());

  const response = NextResponse.redirect(authorizationUrl);

  // Store state in cookies
  response.cookies.set(`${providerConfig.cookiePrefix}oauth_state`, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });

  // Store PKCE code verifier if used
  if (codeVerifier) {
    response.cookies.set(
      `${providerConfig.cookiePrefix}code_verifier`,
      codeVerifier,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      }
    );
  }

  console.log(
    "[/oauth/[provider]/authorize] Set cookies for state and code_verifier"
  );
  console.log("State cookie:", state);
  console.log("Code Verifier cookie:", codeVerifier);

  return response;
}
