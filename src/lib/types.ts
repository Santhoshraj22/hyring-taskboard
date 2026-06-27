
export type Status = "todo" | "inprogress" | "done";

export interface Card {
  id: string;
  title: string;
  status: Status;
  position: number;
  created_at: string;
  updated_at: string;
}



export type WsEvent =
  | { type: "card:created"; card: Card }
  | { type: "card:updated"; card: Card }
  | { type: "card:deleted"; id: string }
  | { type: "presence"; count: number };
