

const { WebSocketServer, WebSocket } = require("ws");

const PORT = process.env.WS_PORT || 4000;
const wss = new WebSocketServer({ port: PORT });

/** @type {Set<WebSocket>} */
const clients = new Set();

/**
 * Broadcast a message to all clients except the sender.
 * If sender is null, broadcast to everyone (e.g., presence updates).
 * @param {object} payload
 * @param {WebSocket|null} sender
 */
function broadcast(payload, sender = null) {
  const msg = JSON.stringify(payload);
  for (const client of clients) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}


function broadcastPresence() {
  const msg = JSON.stringify({ type: "presence", count: clients.size });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected. Total: ${clients.size}`);

  broadcastPresence();

  ws.on("message", (raw) => {
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      console.warn("[WS] Received non-JSON message, ignoring.");
      return;
    }


    const validTypes = ["card:created", "card:updated", "card:deleted"];
    if (validTypes.includes(payload.type)) {
      broadcast(payload, ws);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${clients.size}`);
    broadcastPresence();
  });

  ws.on("error", (err) => {
    console.error("[WS] Socket error:", err.message);
    clients.delete(ws);
    broadcastPresence();
  });
});

console.log(`[WS] WebSocket server listening on ws://localhost:${PORT}`);
