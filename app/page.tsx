import { cookies } from "next/headers";

import Link from "next/link";
import { ConnectButton } from "./components/ConnectButton";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";

import React from "react";
import { VALID_PROVIDERS, getProviderConfig } from "@/lib/oauth-config";

export default async function Home() {
  const cookieStore = await cookies();

  const validProviders = VALID_PROVIDERS;

  // Fetch data for all providers
  const providerDataMap = await Promise.all(
    validProviders.map(async (provider) => {
      const accessToken = cookieStore.get(provider + "_access_token")?.value;
      const refreshToken = cookieStore.get(provider + "_refresh_token")?.value;
      return {
        provider,
        accessToken: accessToken,
        refreshToken: refreshToken,
      };
    })
  );

  return (
    <div className="min-h-screen mx-5">
      <div className="mx-auto py-8 space-y-8">
        {/* Header */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter">
          OAuth Integrations
        </h1>

        {/* Integration Items */}
        <ItemGroup className="border mx-auto">
          {providerDataMap.map(
            ({ provider, accessToken, refreshToken }, i, arr) => {
              return (
                <React.Fragment key={provider}>
                  <Item key={provider}>
                    {/* <ItemHeader>{provider.name}</ItemHeader> */}
                    <ItemContent>
                      <ItemTitle>{provider}</ItemTitle>
                      <ItemDescription className="font-mono wrap-anywhere">
                        {!accessToken
                          ? "Not connected."
                          : accessToken.replace(
                              // mask all characters except first 7 and last 4
                              /(.{7})(.*)(.{4})/,
                              (_, p1, p2, p3) => p1 + "*".repeat(p2.length) + p3
                            )}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="flex flex-col items-end">
                      <ConnectButton
                        provider={provider}
                        isConnected={!!accessToken}
                      />
                    </ItemActions>
                  </Item>
                  {i < arr.length - 1 && <ItemSeparator />}
                </React.Fragment>
              );
            }
          )}
        </ItemGroup>
      </div>
    </div>
  );
}
