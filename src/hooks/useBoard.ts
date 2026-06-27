
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Card, Status, WsEvent } from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";
const RECONNECT_DELAY_MS = 2000;

export type ConnectionState = "connecting" | "connected" | "reconnecting";

interface BoardState {
  cards: Card[];
  onlineCount: number;
  connectionState: ConnectionState;
  addCard: (title: string, status: Status) => Promise<void>;
  updateCard: (id: string, patch: Partial<Pick<Card, "title" | "status" | "position">>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  reorderCards: (moves: Array<{ id: string; status: Status; position: number }>) => Promise<void>;
}

export function useBoard(): BoardState {
  const [cards, setCards] = useState<Card[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const wsSend = useCallback((event: WsEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);


  const applyRemoteEvent = useCallback((event: WsEvent) => {
    switch (event.type) {
      case "card:created":
        setCards((prev) =>
          prev.some((c) => c.id === event.card.id)
            ? prev
            : [...prev, event.card]
        );
        break;

      case "card:updated":
        setCards((prev) =>
          prev.map((c) => {
            if (c.id !== event.card.id) return c;
           
            return new Date(event.card.updated_at) >= new Date(c.updated_at)
              ? event.card
              : c;
          })
        );
        break;

      case "card:deleted":
        setCards((prev) => prev.filter((c) => c.id !== event.id));
        break;

      case "presence":
        setOnlineCount(event.count);
        break;
    }
  }, []);



  const connect = useCallback(() => {
    if (!isMounted.current) return;
    setConnectionState((s) => (s === "connected" ? "reconnecting" : s));

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      setConnectionState("connected");
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (evt) => {
      try {
        const event: WsEvent = JSON.parse(evt.data);
        applyRemoteEvent(event);
      } catch {
      
      }
    };

    ws.onclose = () => {
      if (!isMounted.current) return;
      setConnectionState("reconnecting");
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => ws.close();
  }, [applyRemoteEvent]);

  useEffect(() => {
    isMounted.current = true;

    
    fetch("/api/cards")
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((data: unknown) => {
        if (isMounted.current) setCards(Array.isArray(data) ? (data as Card[]) : []);
      })
      .catch((err) => {
        console.error('[useBoard] Failed to load cards:', err);
        if (isMounted.current) setCards([]);
      });

   
    setConnectionState("connecting");
    connect();

    return () => {
      isMounted.current = false;
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);



  const addCard = useCallback(
    async (title: string, status: Status) => {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status }),
      });
      if (!res.ok) throw new Error("Failed to create card");
      const card: Card = await res.json();

      
      setCards((prev) => [...prev, card]);
    
      wsSend({ type: "card:created", card });
    },
    [wsSend]
  );

  const updateCard = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Card, "title" | "status" | "position">>
    ) => {
      
      const current = cards.find((c) => c.id === id);
      const body = { ...patch, updated_at: current?.updated_at };

      const res = await fetch(`/api/cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        
        const fresh: Card[] = await fetch("/api/cards").then((r) => r.json());
        setCards(fresh);
        return;
      }
      if (!res.ok) throw new Error("Failed to update card");
      const card: Card = await res.json();

   
      setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    
      wsSend({ type: "card:updated", card });
    },
    [cards, wsSend]
  );

  const removeCard = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete card");

    
      setCards((prev) => prev.filter((c) => c.id !== id));
     
      wsSend({ type: "card:deleted", id });
    },
    [wsSend]
  );

  const reorderCards = useCallback(
    async (moves: Array<{ id: string; status: Status; position: number }>) => {
      const res = await fetch("/api/cards/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves }),
      });
      if (!res.ok) throw new Error("Failed to reorder cards");
      const updated: Card[] = await res.json();

   
      setCards((prev) =>
        prev.map((c) => {
          const u = updated.find((u) => u.id === c.id);
          return u ?? c;
        })
      );
   
      for (const card of updated) {
        wsSend({ type: "card:updated", card });
      }
    },
    [wsSend]
  );

  return {
    cards,
    onlineCount,
    connectionState,
    addCard,
    updateCard,
    removeCard,
    reorderCards,
  };
}
