

"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import CardItem from "./CardItem";
import type { Card, Status } from "@/lib/types";

const COLUMN_LABELS: Record<Status, string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
};

const COLUMN_ACCENT: Record<Status, string> = {
  todo: "border-t-slate-400",
  inprogress: "border-t-indigo-400",
  done: "border-t-emerald-400",
};

const COLUMN_BADGE: Record<Status, string> = {
  todo: "bg-slate-100 text-slate-600",
  inprogress: "bg-indigo-100 text-indigo-700",
  done: "bg-emerald-100 text-emerald-700",
};

interface Props {
  status: Status;
  cards: Card[];
  onAdd: (title: string, status: Status) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export default function Column({ status, cards, onAdd, onRename, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const title = draft.trim();
    if (title) {
      onAdd(title, status);
      setDraft("");
      setAdding(false);
    }
  }

  return (
    <div
      className={`flex flex-col rounded-xl border-t-4 bg-gray-50 border border-gray-200 ${COLUMN_ACCENT[status]}
        ${isOver ? "ring-2 ring-indigo-300" : ""}
        transition-all min-h-[200px] w-full`}
    >
    
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="font-semibold text-gray-700 text-sm tracking-wide">
          {COLUMN_LABELS[status]}
        </h2>
        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${COLUMN_BADGE[status]}`}>
          {cards.length}
        </span>
      </div>

    
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-2 px-3 pb-2 min-h-[60px]"
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>

      
      <div className="px-3 pb-3">
        {adding ? (
          <div className="bg-white rounded-lg border border-indigo-300 shadow-sm p-2 space-y-2">
            <textarea
              autoFocus
              rows={2}
              placeholder="Card title…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd();
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setDraft("");
                }
              }}
              className="w-full text-sm resize-none outline-none text-gray-800 placeholder-gray-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 py-1 font-medium transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => { setAdding(false); setDraft(""); }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-left text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
          >
            + Add card
          </button>
        )}
      </div>
    </div>
  );
}
