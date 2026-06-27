

import { NextRequest, NextResponse } from "next/server";
import { createCard, getAllCards } from "@/lib/cardQueries";
import type { Status } from "@/lib/types";

export async function GET() {
  try {
    const cards = await getAllCards();
    return NextResponse.json(cards);
  } catch (err) {
    console.error("[GET /api/cards]", err);
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = (body.title ?? "").trim();
    const status: Status = body.status ?? "todo";

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const validStatuses: Status[] = ["todo", "inprogress", "done"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const card = await createCard(title, status);
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    console.error("[POST /api/cards]", err);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }
}
