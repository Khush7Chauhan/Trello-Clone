import { createHmac, timingSafeEqual } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";

const WS_PORT = Number(process.env.WS_PORT ?? 3002);
const WS_INTERNAL_PORT = Number(process.env.WS_INTERNAL_PORT ?? 3003);
const WS_INTERNAL_TOKEN = process.env.WS_INTERNAL_TOKEN;
if (!WS_INTERNAL_TOKEN) {
  console.warn("WS_INTERNAL_TOKEN is not set in apps/websockets/.env — joins and broadcasts are off");
}

type RoomUser = { id: string; email: string };
