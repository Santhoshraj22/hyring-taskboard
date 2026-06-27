

import { NextRequest, NextResponse } from "next/server";
import { reorderCards } from "@/lib/cardQueries";
import type { Status } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const moves: Array<{ id: string; status: Status; position: number }> =
      body.moves ?? [];

    if (!Array.isArray(moves) || moves.length === 0) {
      return NextResponse.json({ error: "moves array is required" }, { status: 400 });
    }

    const updated = await reorderCards(moves);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/cards/reorder]", err);
    return NextResponse.json({ error: "Failed to reorder cards" }, { status: 500 });
  }
}
