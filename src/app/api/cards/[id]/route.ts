
import { NextRequest, NextResponse } from "next/server";
import { deleteCard, updateCard } from "@/lib/cardQueries";

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const body = await req.json();

    const patch: Parameters<typeof updateCard>[1] = {};
    if (body.title !== undefined) patch.title = String(body.title).trim();
    if (body.status !== undefined) patch.status = body.status;
    if (body.position !== undefined) patch.position = Number(body.position);

    const card = await updateCard(id, patch, body.updated_at);

    if (!card) {
      
      return NextResponse.json(
        { error: "Card not found or update was rejected (stale data)" },
        { status: 409 }
      );
    }

    return NextResponse.json(card);
  } catch (err) {
    console.error("[PATCH /api/cards/:id]", err);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const deleted = await deleteCard(id);

    if (!deleted) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/cards/:id]", err);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
