"use client";

import { useEffect } from "react";

export default function OAuthSuccess({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  useEffect(() => {
    const processParams = async () => {
      const { provider } = await params;

      // Send message to parent window
      if (window.opener) {
        window.opener.postMessage(
          { type: "oauth-success", provider },
          window.location.origin
        );
      }
    };

    processParams();
  }, [params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Authorization successful!
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          You can close this window.
        </p>
      </div>
    </div>
  );
}
