-- Hyring Task Board Schema
-- Run: psql -U your_user -d your_db -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS cards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL CHECK (char_length(title) > 0),
  status      TEXT        NOT NULL DEFAULT 'todo'
                          CHECK (status IN ('todo', 'inprogress', 'done')),
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast column fetching sorted by position
CREATE INDEX IF NOT EXISTS idx_cards_status_position ON cards (status, position);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cards_updated_at ON cards;
CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed with example cards (optional — remove if you prefer a blank board)
INSERT INTO cards (title, status, position) VALUES
  ('Project scaffold',    'done',       0),
  ('Postgres connection', 'done',       1),
  ('Card CRUD API',       'inprogress', 0),
  ('Board UI layout',     'inprogress', 1),
  ('Design the cards table',   'todo', 0),
  ('Set up the WebSocket server', 'todo', 1),
  ('Add reconnect handling',   'todo', 2)
ON CONFLICT DO NOTHING;
