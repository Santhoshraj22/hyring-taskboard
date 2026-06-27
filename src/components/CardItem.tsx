
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useRef, useEffect } from "react";
import type { Card } from "@/lib/types";

interface Props {
  card: Card;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export default function CardItem({ card, onRename, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== card.title) {
      onRename(card.id, trimmed);
    } else {
      setDraft(card.title);
    }
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white rounded-lg border border-gray-200 shadow-sm p-3 select-none
        ${isDragging ? "opacity-40 shadow-lg ring-2 ring-indigo-400" : "hover:shadow-md"}
        transition-shadow`}
    >
      <div className="flex items-start gap-2">
      
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag card"
          className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
            <circle cx="3" cy="3" r="1.5" />
            <circle cx="9" cy="3" r="1.5" />
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="9" cy="8" r="1.5" />
            <circle cx="3" cy="13" r="1.5" />
            <circle cx="9" cy="13" r="1.5" />
          </svg>
        </button>

        
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(card.title);
                  setEditing(false);
                }
              }}
              className="w-full text-sm text-gray-800 border border-indigo-400 rounded px-1 py-0.5 outline-none"
            />
          ) : (
            <p
              className="text-sm text-gray-800 leading-snug break-words cursor-text"
              onDoubleClick={() => {
                setDraft(card.title);
                setEditing(true);
              }}
              title="Double-click to rename"
            >
              {card.title}
            </p>
          )}
        </div>

      
        <button
          onClick={() => onDelete(card.id)}
          aria-label="Delete card"
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
