Hyring Real-Time Task Board
A shared Kanban board with live sync, drag-and-drop, and presence — built with Next.js (App Router), a standalone Node.js WebSocket server, and PostgreSQL.


Features
- Three-column board (To Do / In Progress / Done)
- Full card CRUD (create, rename, move, delete)
- Persistent state in PostgreSQL
- Live sync via WebSocket (no page reload)
- Changes don't duplicate on the sender's screen
- Auto-reconnects with a visible status badge
- Live online user count (presence)
- Drag-and-drop within and across columns, persisted
- Last-write-wins conflict handling via updated_at


Local Setup

Prerequisites
- Node.js 18+
- PostgreSQL 14+

1. Clone & Install
git clone <repo-url>
cd hyring-taskboard
npm install

2. Configure Environment
cp .env.example .env
Open .env and fill in your details

Variable              Description
DATABASE_URL          e.g. postgresql://user:pass@localhost:5432/taskboard
WS_PORT               WebSocket server port (default: 4000)
NEXT_PUBLIC_WS_URL    Browser WS URL (default: ws://localhost:4000)

3. Setup Database
createdb taskboard
npm run db:migrate

4. Run in Development
npm run dev

Opens Next.js on port 3000 and WebSocket server on port 4000 simultaneously.
Open http://localhost:3000 — then open a second browser window and watch changes sync instantly!


Why a Separate WebSocket Server?
Next.js API routes are serverless-style and can't hold persistent connections. So a lightweight standalone ws server (~150 lines) runs alongside Next.js via concurrently. In production, deploy it as a separate service (Railway, Render, or a dedicated Node container).



Future Improvements
- User login and multi-board support
- Undo / Redo with event history
- Cursor presence per user
- Redis pub/sub for horizontal scaling
- Unit and end-to-end automated tests
