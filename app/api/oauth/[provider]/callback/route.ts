import { NextRequest, NextResponse } from "next/server";
import * as oauth from "oauth4webapi";
import {
  getClient,
  getAuthorizationServer,
  getProviderConfig,
  Provider,
  isValidProvider,
} from "@/lib/oauth-config";

export async function GET(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ provider: Provider }> }
) {
  const { provider } = await routeParams;

  // Validate provider
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const client = getClient(provider);
  const _as = getAuthorizationServer(provider);
  const providerConfig = getProviderConfig(provider);

  const url = new URL(request.url);

  // MARK: Validate the authorization response using oauth4webapi
  const storedState = request.cookies.get(
    `${providerConfig.cookiePrefix}oauth_state`
  )?.value;

  if (!storedState) {
    return NextResponse.json(
      { error: "Missing stored state" },
      { status: 400 }
    );
  }

  const currentUrl = url.searchParams;
  let authParams: URLSearchParams;

  try {
    // Validates an OAuth 2.0 Authorization Response or Authorization Error Response message returned from the authorization server's as.authorization\_endpoint.
    // https://github.com/panva/oauth4webapi/blob/main/docs/functions/validateAuthResponse.md
    authParams = oauth.validateAuthResponse(
      _as,
      client,
      currentUrl,
      storedState
    );
  } catch (error) {
    console.error("Authorization validation error:", error);
    return NextResponse.json(
      { error: "Authorization validation failed" },
      { status: 400 }
    );
  }

  // MARK: Exchange authorization code for tokens
  const code = authParams.get("code");
  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  // Get PKCE code verifier if used
  let codeVerifier: string | undefined;
  if (providerConfig.usePKCE) {
    codeVerifier = request.cookies.get(
      `${providerConfig.cookiePrefix}code_verifier`
    )?.value;

    if (!codeVerifier) {
      return NextResponse.json(
        { error: "Missing code verifier" },
        { status: 400 }
      );
    }
  }

  try {
    // Step 3: Make token request using oauth4webapi
    // Performs an Authorization Code grant request at the as.token\_endpoint.
    // https://github.com/panva/oauth4webapi/blob/main/docs/functions/authorizationCodeGrantRequest.md
    const clientSecret = String(client.client_secret);
    let tokenResponse = await oauth.authorizationCodeGrantRequest(
      _as,
      client,
      client.token_endpoint_auth_method === "client_secret_post"
        ? oauth.ClientSecretPost(clientSecret)
        : oauth.ClientSecretBasic(clientSecret),
      authParams,
      providerConfig.redirectUri,
      codeVerifier || oauth.nopkce,
      {
        [oauth.customFetch](url, options) {
          console.log("Token request fetch args:\n", url, options);
          console.log(
            `Basic ${btoa(`${client.client_id}:${client.client_secret}`)}`
          );
          return fetch(url, {
            ...options,
            headers: {
              // RFC 6749 Section 2.3.1 states that the clientID and password
              // are to be encoded via "application/x-www-form-urlencoded".
              // Supabase doesn't seem to comply with that, so base64 encode the plan strings instead.
              ...(provider === "supabase"
                ? {
                    Accept: "application/json",
                    Authorization: `Basic ${btoa(
                      `${client.client_id}:${client.client_secret}`
                    )}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                  }
                : {
                    ...options?.headers,
                  }),
            },
          });
        },
      }
    );

    // Unlike the 200 status as specified in RFC 6749, some providers (e.g., GitHub)
    // Supabase returns 201 instead
    if (provider === "supabase") {
      if (tokenResponse.status === 201) {
        tokenResponse = new Response(tokenResponse.body, {
          ...tokenResponse,
          status: 200,
        });
      }
    }

    // Validates Authorization Code Grant Response instance to be one coming from the as.token\_endpoint.
    // https://github.com/panva/oauth4webapi/blob/main/docs/functions/processAuthorizationCodeResponse.md
    const result = await oauth.processAuthorizationCodeResponse(
      _as,
      client,
      tokenResponse
    );

    // Redirect to success page
    const successUrl = new URL(`/oauth/${provider}/success`, request.url);
    const res = NextResponse.redirect(successUrl);

    // Store tokens in cookies
    res.cookies.set(
      `${providerConfig.cookiePrefix}access_token`,
      result.access_token,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: result.expires_in ?? 3600,
      }
    );

    if (result.refresh_token) {
      res.cookies.set(
        `${providerConfig.cookiePrefix}refresh_token`,
        result.refresh_token,
        {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
        }
      );
    }

    // Clear temporary cookies
    res.cookies.delete(`${providerConfig.cookiePrefix}oauth_state`);
    if (providerConfig.usePKCE) {
      res.cookies.delete(`${providerConfig.cookiePrefix}code_verifier`);
    }

    return res;
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json(
      { error: "Failed to exchange code for token" },
      { status: 500 }
    );
  }
}
