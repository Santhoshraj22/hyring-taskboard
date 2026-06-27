# 🗂 Hyring Real-Time Task Board

A shared Kanban board with **live sync**, **drag-and-drop**, and **presence** — built with Next.js (App Router), a standalone Node.js WebSocket server, and PostgreSQL.

---

## ✅ Features

| Feature | Status |
|---|---|
| Three-column board (To Do / In Progress / Done) | ✅ |
| Full card CRUD (create, rename, move, delete) | ✅ |
| Persistent state in PostgreSQL | ✅ |
| Live sync via WebSocket (no page reload) | ✅ |
| Originating client doesn't double-apply changes | ✅ |
| Graceful reconnect with visible indicator | ✅ |
| Live online user count (presence) | ✅ bonus |
| Drag-and-drop within + across columns, persisted | ✅ bonus |
| Last-write-wins conflict handling via `updated_at` | ✅ bonus |

---

## 🚀 Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Clone & install

```bash
git clone <repo-url>
cd hyring-taskboard
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in your DATABASE_URL
```

**Required env vars:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/taskboard` |
| `WS_PORT` | Port for the WebSocket server (default: `4000`) |
| `NEXT_PUBLIC_WS_URL` | URL the browser uses to connect to WS (default: `ws://localhost:4000`) |

### 3. Create the database and run migrations

```bash
# Create DB (if not exists)
createdb taskboard

# Apply schema + seed data
npm run db:migrate
# (or: psql $DATABASE_URL -f schema.sql)
```

### 4. Run in development

```bash
npm run dev
```

This starts **both** Next.js (port 3000) and the WebSocket server (port 4000) with `concurrently`.

Open [http://localhost:3000](http://localhost:3000).  
Open a **second browser window** alongside it — changes in one appear in the other instantly.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser A                      Browser B               │
│  ┌────────────────┐             ┌────────────────┐      │
│  │  Next.js UI    │             │  Next.js UI    │      │
│  │  (useBoard)    │             │  (useBoard)    │      │
│  └───────┬────────┘             └──────┬─────────┘      │
│          │ REST (CRUD)                 │ REST (CRUD)     │
│          ▼                            ▼                  │
│  ┌────────────────────────────────────────────────┐     │
│  │          Next.js API Routes (/api/cards)        │     │
│  └──────────────────────┬─────────────────────────┘     │
│                         │ pg Pool                       │
│                         ▼                               │
│                  ┌────────────┐                         │
│                  │ PostgreSQL │                         │
│                  └────────────┘                         │
│                                                         │
│  Browser A ◄──────── WebSocket ──────────► Browser B   │
│             ws://localhost:4000                         │
│          (ws-server/index.js — standalone Node)         │
└─────────────────────────────────────────────────────────┘
```

### Why a separate WS server?

Next.js API routes are serverless-style and can't hold persistent WebSocket connections. A small standalone `ws` server (150 lines) runs alongside Next.js via `concurrently`. In production, deploy it as a separate service (e.g. a Railway/Render background worker, or a dedicated Node container).

---

## 📁 File Structure

```
hyring-taskboard/
├── schema.sql                   # Postgres migration + seed
├── .env.example
├── ws-server/
│   └── index.js                 # Standalone WebSocket server
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   └── api/
    │       └── cards/
    │           ├── route.ts         # GET list, POST create
    │           ├── reorder/
    │           │   └── route.ts     # POST batch reorder
    │           └── [id]/
    │               └── route.ts     # PATCH update, DELETE
    ├── components/
    │   ├── Board.tsx            # DnD orchestrator + layout
    │   ├── Column.tsx           # Droppable column + add form
    │   ├── CardItem.tsx         # Draggable card + rename/delete
    │   └── PresencePill.tsx     # Connected/Reconnecting badge
    ├── hooks/
    │   └── useBoard.ts          # Central state, WS, CRUD actions
    └── lib/
        ├── db.ts                # pg Pool singleton
        ├── cardQueries.ts       # All SQL queries
        └── types.ts             # Shared TypeScript types
```

---

## 🔑 Key Design Decisions

### 1. WebSocket relay, not pub/sub
The WS server is a pure relay: clients send board events (`card:created`, `card:updated`, `card:deleted`) and the server forwards them to all *other* connected clients. There's no message queue or broker. This keeps the server at ~150 lines and avoids infra complexity for the scope of this task.

The originating client applies its change **optimistically** before broadcasting, so it never re-receives and double-applies its own event.

### 2. Last-write-wins conflict resolution
Each card carries an `updated_at` timestamp (auto-set by a Postgres trigger). When a client patches a card, it sends its local `updated_at`. The SQL `UPDATE` includes `AND updated_at <= $supplied_timestamp` — if another writer already committed a newer version, zero rows are updated and the API returns **HTTP 409**. The client responds by re-fetching the full board to snap back to truth.

On the client side, incoming WS events from other users are also gated: `new Date(event.card.updated_at) >= new Date(local.updated_at)` — stale broadcasts are silently ignored.

### 3. Optimistic updates
All CRUD actions update local React state *before* the REST call completes, so the UI feels instant. If the server rejects the change (409 conflict, network error), state is corrected by re-fetching.

### 4. Drag-and-drop ordering
`@dnd-kit` handles drag interactions. `onDragOver` updates a **local snapshot** of card order for smooth animation. On `onDragEnd`, the final positions are persisted in a single atomic transaction (`/api/cards/reorder`) and broadcast to other clients as a batch of `card:updated` events.

### 5. Reconnect strategy
If the WebSocket closes (server restart, network blip), the client waits 2 seconds and reconnects. On reconnect, the board re-fetches from REST to ensure it didn't miss any events during the outage. A pill in the header shows `Connecting…` → `Connected ✅` → `Reconnecting…`.

---

## ⚖️ Trade-offs

| What | Trade-off |
|---|---|
| Standalone WS server | Simpler than Next.js custom server; requires deploying two processes |
| Last-write-wins | Simple and predictable; operational transforms would be more correct but far more complex |
| No auth | Out of scope; in production you'd add session tokens to WS `connection` event |
| Position gaps after delete | Compacted in a transaction; concurrent deletes could briefly re-use a position (fine for LWW) |
| `concurrently` in dev | Easiest multi-process dev DX; production should use a proper process manager |

---

## 🔮 What I'd Improve With More Time

1. **Auth + per-board access** — multi-board support with invite links
2. **Event sourcing** — persist WS events to a table so late joiners can replay history
3. **Operational transforms or CRDTs** — more correct multi-user editing (e.g. Yjs)
4. **Cursor presence** — show which user is hovering/editing which card
5. **Undo** — Ctrl+Z using an event log
6. **Tests** — unit tests for `cardQueries.ts` and `useBoard.ts`; Playwright e2e for the sync scenario
7. **Horizontal WS scaling** — swap the in-process `Set<WebSocket>` for Redis pub/sub so multiple WS nodes can serve clients
