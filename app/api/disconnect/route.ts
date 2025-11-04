import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import * as oauth from "oauth4webapi";
import {
  getAuthorizationServer,
  getProviderConfig,
  getClient,
} from "@/lib/oauth-config";

export async function POST(request: NextRequest) {
  const { provider } = await request.json();
  const providerConfig = getProviderConfig(provider);
  const _as = getAuthorizationServer(provider);
  const client = getClient(provider);
  const clientSecret = String(client.client_secret);

  const cookieStore = await cookies();

  const accessToken = cookieStore.get(
    providerConfig.cookiePrefix + "access_token"
  )?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token found for provider" },
      { status: 400 }
    );
  }

  const response = await oauth.revocationRequest(
    _as,
    client,
    client.token_endpoint_auth_method === "client_secret_post"
      ? oauth.ClientSecretPost(clientSecret)
      : oauth.ClientSecretBasic(clientSecret),
    accessToken,
    {
      [oauth.customFetch](url, options) {
        console.log("[revocationRequest]:\n", url, options);
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

  const err = await oauth.processRevocationResponse(response);

  if (err) {
    console.error("Error revoking token:", err);
    return NextResponse.json(
      { error: "Failed to revoke token" },
      { status: 500 }
    );
  }
  cookieStore.delete(providerConfig.cookiePrefix + "access_token");
  cookieStore.delete(providerConfig.cookiePrefix + "refresh_token");

  return NextResponse.json({ success: true });
}
