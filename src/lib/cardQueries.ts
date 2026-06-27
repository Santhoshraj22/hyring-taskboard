

import pool from "./db";
import type { Card, Status } from "./types";


export async function getAllCards(): Promise<Card[]> {
  const { rows } = await pool.query<Card>(
    `SELECT id, title, status, position, created_at, updated_at
     FROM cards
     ORDER BY status, position`
  );
  return rows;
}


export async function createCard(
  title: string,
  status: Status = "todo"
): Promise<Card> {
  const { rows } = await pool.query<Card>(
    `INSERT INTO cards (title, status, position)
     VALUES ($1, $2, COALESCE(
       (SELECT MAX(position) + 1 FROM cards WHERE status = $2), 0
     ))
     RETURNING id, title, status, position, created_at, updated_at`,
    [title, status]
  );
  return rows[0];
}


export async function updateCard(
  id: string,
  patch: Partial<Pick<Card, "title" | "status" | "position">>,
  clientUpdatedAt?: string
): Promise<Card | null> {

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (patch.title !== undefined) {
    fields.push(`title = $${idx++}`);
    values.push(patch.title);
  }
  if (patch.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(patch.status);
  }
  if (patch.position !== undefined) {
    fields.push(`position = $${idx++}`);
    values.push(patch.position);
  }

  if (fields.length === 0) return null;

  values.push(id); 


  let conflictGuard = "";
  if (clientUpdatedAt) {
    values.push(clientUpdatedAt); 
    conflictGuard = `AND updated_at <= $${idx + 1}`;
  }

  const { rows } = await pool.query<Card>(
    `UPDATE cards
     SET ${fields.join(", ")}
     WHERE id = $${idx} ${conflictGuard}
     RETURNING id, title, status, position, created_at, updated_at`,
    values
  );

  return rows[0] ?? null; 
}


export async function deleteCard(id: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<Card>(
      "DELETE FROM cards WHERE id = $1 RETURNING status, position",
      [id]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    const { status, position } = rows[0];
  
    await client.query(
      `UPDATE cards SET position = position - 1
       WHERE status = $1 AND position > $2`,
      [status, position]
    );
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}


export async function reorderCards(
  moves: Array<{ id: string; status: Status; position: number }>
): Promise<Card[]> {
  if (moves.length === 0) return [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated: Card[] = [];
    for (const { id, status, position } of moves) {
      const { rows } = await client.query<Card>(
        `UPDATE cards SET status = $1, position = $2
         WHERE id = $3
         RETURNING id, title, status, position, created_at, updated_at`,
        [status, position, id]
      );
      if (rows[0]) updated.push(rows[0]);
    }
    await client.query("COMMIT");
    return updated;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
