"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
interface ConnectButtonProps {
  provider: string;
  isConnected: boolean;
  usePopup?: boolean;
}

export function ConnectButton({
  provider,
  isConnected,
  usePopup = true,
}: ConnectButtonProps) {
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
    const authUrl = `/api/oauth/${provider}/authorize`;

    if (!usePopup) {
      // Navigate in the same window
      window.location.href = authUrl;
      return;
    }

    // Open in popup
    setIsConnecting(true);

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

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
      <Button
        size={"sm"}
        onClick={handleDisconnect}
        disabled={isDisconnecting}
        variant={"destructive"}
      >
        {isDisconnecting && <Spinner />}
        Disconnect
      </Button>
    );
  }

  return (
    <Button size={"sm"} onClick={handleConnect} disabled={isConnecting}>
      {isConnecting && <Spinner />}
      Connect
    </Button>
  );
}
