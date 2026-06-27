

"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import Column from "./Column";
import PresencePill from "./PresencePill";
import { useBoard } from "@/hooks/useBoard";
import type { Card, Status } from "@/lib/types";

const STATUSES: Status[] = ["todo", "inprogress", "done"];

export default function Board() {
  const {
    cards,
    onlineCount,
    connectionState,
    addCard,
    updateCard,
    removeCard,
    reorderCards,
  } = useBoard();

  const [activeCard, setActiveCard] = useState<Card | null>(null);

 
  const [localCards, setLocalCards] = useState<Card[] | null>(null);
  const displayCards = Array.isArray(localCards ?? cards) ? (localCards ?? cards) : [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function cardsForColumn(status: Status) {
    return displayCards
      .filter((c) => c.status === status)
      .sort((a, b) => a.position - b.position);
  }

 

  function onDragStart({ active }: DragStartEvent) {
    const card = displayCards.find((c) => c.id === active.id);
    if (card) {
      setActiveCard(card);
      setLocalCards([...cards]); 
    }
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !localCards) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeCard = localCards.find((c) => c.id === activeId);
    if (!activeCard) return;

   
    const overIsColumn = STATUSES.includes(overId as Status);
    const overCard = localCards.find((c) => c.id === overId);
    const targetStatus: Status = overIsColumn
      ? (overId as Status)
      : (overCard?.status ?? activeCard.status);

    if (activeCard.status !== targetStatus) {
    
      setLocalCards((prev) =>
        (prev ?? []).map((c) =>
          c.id === activeId
            ? { ...c, status: targetStatus, position: 9999 }
            : c
        )
      );
    } else if (!overIsColumn && overCard) {
      
      const colCards = localCards
        .filter((c) => c.status === targetStatus)
        .sort((a, b) => a.position - b.position);

      const oldIdx = colCards.findIndex((c) => c.id === activeId);
      const newIdx = colCards.findIndex((c) => c.id === overId);
      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = arrayMove(colCards, oldIdx, newIdx);
      const updated = reordered.map((c, i) => ({ ...c, position: i }));

      setLocalCards((prev) =>
        (prev ?? []).map((c) => {
          const u = updated.find((u) => u.id === c.id);
          return u ?? c;
        })
      );
    }
  }

  async function onDragEnd({ active }: DragEndEvent) {
    setActiveCard(null);
    if (!localCards) return;

    const moves = STATUSES.flatMap((status) => {
      const col = localCards
        .filter((c) => c.status === status)
        .sort((a, b) => a.position - b.position)
        .map((c, i) => ({ id: c.id, status, position: i }));
      return col;
    });

    setLocalCards(null); 

    await reorderCards(moves).catch(console.error);
  }

  

  async function handleRename(id: string, title: string) {
    await updateCard(id, { title }).catch(console.error);
  }

  async function handleDelete(id: string) {
    await removeCard(id).catch(console.error);
  }

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
     
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-indigo-600 tracking-tight">
            🗂 Hyring Board
          </span>
          <span className="text-xs text-gray-400 hidden sm:inline">
            Real-time Task Board
          </span>
        </div>
        <PresencePill count={onlineCount} state={connectionState} />
      </header>

     
      <main className="p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                cards={cardsForColumn(status)}
                onAdd={(title, st) => addCard(title, st).catch(console.error)}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </div>

         
          <DragOverlay>
            {activeCard && (
              <div className="bg-white rounded-lg border border-indigo-300 shadow-xl p-3 opacity-90 rotate-1 w-64">
                <p className="text-sm text-gray-800">{activeCard.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}
