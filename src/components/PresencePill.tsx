
"use client";

import type { ConnectionState } from "@/hooks/useBoard";

interface Props {
  count: number;
  state: ConnectionState;
}

export default function PresencePill({ count, state }: Props) {
  const isConnected = state === "connected";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium border
        ${isConnected
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-amber-50 border-amber-200 text-amber-700"
        }`}
    >
     
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isConnected ? "bg-green-500" : "bg-amber-500"
          }`}
        />
      </span>

      {isConnected ? (
        <>
          <span>👥 {count} online</span>
        </>
      ) : (
        <span>
          {state === "connecting" ? "Connecting…" : "Reconnecting…"}
        </span>
      )}
    </div>
  );
}
