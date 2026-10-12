import { createHmac, timingSafeEqual } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";

const WS_PORT = Number(process.env.WS_PORT ?? 3002);
const WS_INTERNAL_PORT = Number(process.env.WS_INTERNAL_PORT ?? 3003);
const WS_INTERNAL_TOKEN = process.env.WS_INTERNAL_TOKEN;
if (!WS_INTERNAL_TOKEN) {
  console.warn("WS_INTERNAL_TOKEN is not set in apps/websockets/.env — joins and broadcasts are off");
}

type RoomUser = { id: string; email: string };

function verifyRoomToken(boardId: string, token: unknown): RoomUser | null {
  if (!WS_INTERNAL_TOKEN || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(createHmac("sha256", WS_INTERNAL_TOKEN).update(payload).digest("hex"));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (decoded.boardId !== boardId) return null;
    if (typeof decoded.exp !== "number" || decoded.exp < Date.now()) return null;
    if (typeof decoded.user?.id !== "string" || typeof decoded.user?.email !== "string") return null;
    return { id: decoded.user.id, email: decoded.user.email };
  } catch {
    return null;
  }
}

type Member = { user: RoomUser; socket: WebSocket };
const rooms = new Map<string, Member[]>();

function send(socket: WebSocket, message: unknown) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(boardId: string, message: unknown, except?: WebSocket): number {
  let delivered = 0;
  for (const member of rooms.get(boardId) ?? []) {
    if (member.socket === except) continue;
    send(member.socket, message);
    delivered++;
  }
  return delivered;
}

function leave(boardId: string, socket: WebSocket) {
  const members = rooms.get(boardId);
  if (!members) return;
  const me = members.find((m) => m.socket === socket);
  if (!me) return;
  const rest = members.filter((m) => m.socket !== socket);
  if (rest.length) rooms.set(boardId, rest);
  else rooms.delete(boardId);
  // Another tab of the same person still open? Then they have not left.
  if (!rest.some((m) => m.user.id === me.user.id)) {
    broadcast(boardId, { type: "leave", userId: me.user.id });
  }
}