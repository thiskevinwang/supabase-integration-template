import { cookies } from "next/headers";
import { SupabaseManagementAPI } from "supabase-management-js";
import { Database, Github } from "lucide-react";
import Image from "next/image";
import { ConnectButton } from "./components/ConnectButton";
import { OAuthDebugPanel } from "./components/OAuthDebugPanel";
import { OAuthClient } from "@/lib/oauth-client";

interface SupabaseOrganization {
  id: string;
  name: string;
}

interface GitHubOrganization {
  login: string;
  id: number;
  avatar_url: string;
  description?: string;
}

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
  email?: string;
}

interface GitHubData {
  user: GitHubUser;
  orgs: GitHubOrganization[];
}

async function getSupabaseOrganizations(accessToken: string) {
  try {
    // Using the new OAuthClient for consistency
    const client = new OAuthClient("supabase", accessToken);

    // Verify token is valid before making API calls
    const isValid = await client.validateToken();
    if (!isValid) {
      console.error("Supabase token is invalid");
      return null;
    }

    const supabaseClient = new SupabaseManagementAPI({ accessToken });
    return await supabaseClient.getOrganizations();
  } catch (error) {
    console.error("Supabase error:", error);
    return null;
  }
}

async function getGitHubData(accessToken: string): Promise<GitHubData | null> {
  try {
    const [userResponse, orgsResponse] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }),
      fetch("https://api.github.com/user/orgs", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }),
    ]);

    if (!userResponse.ok || !orgsResponse.ok) {
      return null;
    }

    const user = await userResponse.json();
    const orgs = await orgsResponse.json();

    return { user, orgs };
  } catch (error) {
    console.error("GitHub error:", error);
    return null;
  }
}

export default async function Home() {
  const cookieStore = await cookies();
  const supabaseToken = cookieStore.get("supabase_access_token")?.value;
  const githubToken = cookieStore.get("github_access_token")?.value;

  const [supabaseOrgs, githubData] = await Promise.all([
    supabaseToken ? getSupabaseOrganizations(supabaseToken) : null,
    githubToken ? getGitHubData(githubToken) : null,
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-7xl mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-semibold text-black dark:text-zinc-50">
            OAuth Integration Dashboard
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Connect and manage your accounts across multiple platforms
          </p>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supabase Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                      Supabase
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {supabaseToken ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                <ConnectButton
                  provider="supabase"
                  isConnected={!!supabaseToken}
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {!supabaseToken ? (
                <div className="text-center py-8">
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    Connect your Supabase account to see your organizations
                  </p>
                </div>
              ) : supabaseOrgs && supabaseOrgs.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                    Organizations ({supabaseOrgs.length})
                  </h3>
                  {supabaseOrgs.map((org: SupabaseOrganization) => (
                    <div
                      key={org.id}
                      className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors"
                    >
                      <h4 className="font-medium text-black dark:text-zinc-50">
                        {org.name}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                        {org.id}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    No organizations found
                  </p>
                </div>
              )}

              {/* OAuth Debug Panel */}
              <OAuthDebugPanel
                provider="supabase"
                isConnected={!!supabaseToken}
              />
            </div>
          </div>

          {/* GitHub Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <Github className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                      GitHub
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {githubToken ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                <ConnectButton provider="github" isConnected={!!githubToken} />
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {!githubToken ? (
                <div className="text-center py-8">
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    Connect your GitHub account to see your organizations
                  </p>
                </div>
              ) : githubData ? (
                <div className="space-y-6">
                  {/* User Info */}
                  <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src={githubData.user.avatar_url}
                        alt={githubData.user.login}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                      <div>
                        <h4 className="font-medium text-black dark:text-zinc-50">
                          {githubData.user.name || githubData.user.login}
                        </h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500">
                          @{githubData.user.login}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Organizations */}
                  {githubData.orgs.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Organizations ({githubData.orgs.length})
                      </h3>
                      {githubData.orgs.map((org: GitHubOrganization) => (
                        <div
                          key={org.id}
                          className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:border-gray-500 dark:hover:border-gray-500 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Image
                              src={org.avatar_url}
                              alt={org.login}
                              width={40}
                              height={40}
                              className="rounded"
                            />
                            <div>
                              <h4 className="font-medium text-black dark:text-zinc-50">
                                {org.login}
                              </h4>
                              {org.description && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                                  {org.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    Failed to load GitHub data
                  </p>
                </div>
              )}

              {/* OAuth Debug Panel */}
              <OAuthDebugPanel provider="github" isConnected={!!githubToken} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
