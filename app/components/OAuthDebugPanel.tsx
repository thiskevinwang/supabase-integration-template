"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, User, Key, CheckCircle, XCircle } from "lucide-react";

interface OAuthDebugPanelProps {
  provider: "supabase" | "github";
  isConnected: boolean;
}

interface UserInfo {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  avatar_url?: string;
}

interface TokenInfo {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

export function OAuthDebugPanel({
  provider,
  isConnected,
}: OAuthDebugPanelProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState<{
    userInfo: boolean;
    tokenInfo: boolean;
    refresh: boolean;
  }>({
    userInfo: false,
    tokenInfo: false,
    refresh: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState<boolean | null>(null);

  const fetchUserInfo = async () => {
    setLoading((prev) => ({ ...prev, userInfo: true }));
    setError(null);

    try {
      const response = await fetch(`/api/oauth/${provider}/userinfo`);

      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }

      const data = await response.json();
      setUserInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading((prev) => ({ ...prev, userInfo: false }));
    }
  };

  const fetchTokenInfo = async () => {
    setLoading((prev) => ({ ...prev, tokenInfo: true }));
    setError(null);

    try {
      const response = await fetch(`/api/oauth/${provider}/token-info`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Token info not available for this provider");
        }
        throw new Error("Failed to fetch token info");
      }

      const data = await response.json();
      setTokenInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading((prev) => ({ ...prev, tokenInfo: false }));
    }
  };

  const refreshToken = async () => {
    setLoading((prev) => ({ ...prev, refresh: true }));
    setError(null);
    setRefreshSuccess(null);

    try {
      const response = await fetch(`/api/oauth/${provider}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      setRefreshSuccess(true);
      // Clear cached data so user needs to refetch
      setUserInfo(null);
      setTokenInfo(null);

      // Auto-reload page after successful refresh
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setRefreshSuccess(false);
    } finally {
      setLoading((prev) => ({ ...prev, refresh: false }));
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Key className="w-5 h-5" />
          OAuth Debug Panel - {provider}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUserInfo}
            disabled={loading.userInfo}
          >
            <User className="w-4 h-4 mr-2" />
            {loading.userInfo ? "Loading..." : "Fetch User Info"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTokenInfo}
            disabled={loading.tokenInfo}
          >
            <Key className="w-4 h-4 mr-2" />
            {loading.tokenInfo ? "Loading..." : "Fetch Token Info"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshToken}
            disabled={loading.refresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {loading.refresh ? "Refreshing..." : "Refresh Token"}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Refresh Success */}
        {refreshSuccess !== null && (
          <div
            className={`p-3 rounded-lg border flex items-center gap-2 ${
              refreshSuccess
                ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            }`}
          >
            {refreshSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Token refreshed successfully! Reloading...
                </p>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  Failed to refresh token
                </p>
              </>
            )}
          </div>
        )}

        {/* User Info Display */}
        {userInfo && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
              User Information
            </h4>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex gap-2">
                <span className="text-zinc-500">ID:</span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {userInfo.id}
                </span>
              </div>
              {userInfo.username && (
                <div className="flex gap-2">
                  <span className="text-zinc-500">Username:</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {userInfo.username}
                  </span>
                </div>
              )}
              {userInfo.name && (
                <div className="flex gap-2">
                  <span className="text-zinc-500">Name:</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {userInfo.name}
                  </span>
                </div>
              )}
              {userInfo.email && (
                <div className="flex gap-2">
                  <span className="text-zinc-500">Email:</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {userInfo.email}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Token Info Display */}
        {tokenInfo && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
              Token Information
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Type:</span>
                <Badge variant="secondary">{tokenInfo.token_type}</Badge>
              </div>
              {tokenInfo.expires_in && (
                <div className="flex gap-2">
                  <span className="text-zinc-500">Expires in:</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {tokenInfo.expires_in} seconds
                  </span>
                </div>
              )}
              {tokenInfo.scope && (
                <div className="flex gap-2">
                  <span className="text-zinc-500">Scope:</span>
                  <span className="text-zinc-900 dark:text-zinc-100 break-all">
                    {tokenInfo.scope}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-zinc-500">Token:</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-mono truncate">
                  {tokenInfo.access_token.substring(0, 20)}...
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
