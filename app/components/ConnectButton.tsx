"use client";

import { useState } from "react";

type Provider = "supabase" | "github";

interface ConnectButtonProps {
  provider: Provider;
  isConnected: boolean;
}

export function ConnectButton({ provider, isConnected }: ConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await fetch("/api/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to disconnect:", error);
      setIsDisconnecting(false);
    }
  };

  const handleConnect = () => {
    setIsConnecting(true);

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authUrl = `/api/oauth/${provider}/authorize`;

    const popup = window.open(
      authUrl,
      `${provider}-oauth`,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (
        event.data.type === "oauth-success" &&
        event.data.provider === provider
      ) {
        popup?.close();
        window.location.reload();
      }
    };

    window.addEventListener("message", handleMessage);

    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        setIsConnecting(false);
        window.removeEventListener("message", handleMessage);
        clearInterval(checkPopup);
      }
    }, 500);
  };

  if (isConnected) {
    return (
      <button
        onClick={handleDisconnect}
        disabled={isDisconnecting}
        className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 text-sm text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed w-full"
      >
        {isDisconnecting ? "Disconnecting..." : "Disconnect"}
      </button>
    );
  }

  const providerConfig = {
    supabase: {
      bgColor: "bg-emerald-600 hover:bg-emerald-700",
      textColor: "text-white",
    },
    github: {
      bgColor:
        "bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200",
      textColor: "text-white dark:text-gray-900",
    },
  };

  const config = providerConfig[provider];

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full ${config.bgColor} ${config.textColor}`}
    >
      {isConnecting ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Connecting...
        </>
      ) : (
        `Connect ${provider === "supabase" ? "Supabase" : "GitHub"}`
      )}
    </button>
  );
}
