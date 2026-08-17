import { DurableObject } from "cloudflare:workers";
import {
  applyRoomCommand,
  applyRoomTimeout,
  createRoom,
  joinRoom,
  roomSettlements,
  roomSnapshot,
  RoomCommand,
  RoomGameId,
  RoomState,
  setRoomPlayerConnected,
  upgradeRoomState,
} from "../lib/multiplayer/room";
import { verifyRoomToken } from "../lib/multiplayer/token";

type Env = {
  GAME_ROOMS: DurableObjectNamespace<GameRoom>;
  ROOM_SERVICE_SECRET: string;
  SITE_URL: string;
  SITE_ORIGIN: string;
};

type SocketAttachment = { playerId: string };

export class GameRoom extends DurableObject<Env> {
  private state: RoomState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get<RoomState>("state");
      this.state = stored ? upgradeRoomState(stored) : null;
      if (stored) await ctx.storage.put("state", this.state);
    });
  }

  async init(
    code: string,
    hostId: string,
    hostName: string,
    gameType: RoomGameId,
    maxPlayers?: number,
  ) {
    if (this.state) return;
    this.state = createRoom(code, hostId, hostName, gameType, maxPlayers);
    await this.ctx.storage.put("state", this.state);
  }

  async fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket")
      return new Response("Expected WebSocket", { status: 426 });
    if (!this.state) return new Response("Room not found", { status: 404 });
    const playerId = request.headers.get("X-Player-Id");
    const playerName = request.headers.get("X-Player-Name");
    if (!playerId || !playerName)
      return new Response("Missing player identity", { status: 401 });
    try {
      this.state = joinRoom(this.state, playerId, playerName);
      await this.persist();
    } catch (error) {
      return new Response(error instanceof Error ? error.message : "Join failed", {
        status: 409,
      });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId } satisfies SocketAttachment);
    server.send(JSON.stringify({ type: "snapshot", data: roomSnapshot(this.state, playerId) }));
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    const attachment = socket.deserializeAttachment() as SocketAttachment;
    try {
      if (!this.state) throw new Error("房间不存在");
      const command = JSON.parse(String(message)) as RoomCommand;
      this.state = applyRoomCommand(this.state, attachment.playerId, command);
      await this.persist();
      await this.scheduleTurn();
      this.broadcast();
      if (this.state.phase === "done" && !this.state.settled)
        this.ctx.waitUntil(this.settle());
    } catch (error) {
      socket.send(
        JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : "操作失败",
        }),
      );
    }
  }

  async webSocketClose(socket: WebSocket) {
    const attachment = socket.deserializeAttachment() as SocketAttachment;
    if (!this.state) return;
    this.state = setRoomPlayerConnected(
      this.state,
      attachment.playerId,
      false,
    );
    await this.persist();
    this.broadcast();
  }

  async webSocketError(socket: WebSocket) {
    await this.webSocketClose(socket);
  }

  async alarm() {
    if (
      !this.state?.turnDeadline ||
      this.state.turnDeadline > Date.now() ||
      this.state.phase !== "playing"
    )
      return;
    this.state = applyRoomTimeout(this.state);
    await this.persist();
    await this.scheduleTurn();
    this.broadcast();
    if (this.state.phase === "done" && !this.state.settled)
      this.ctx.waitUntil(this.settle());
  }

  private async persist() {
    if (this.state) await this.ctx.storage.put("state", this.state);
  }

  private async scheduleTurn() {
    if (this.state?.turnDeadline)
      await this.ctx.storage.setAlarm(this.state.turnDeadline);
    else await this.ctx.storage.deleteAlarm();
  }

  private broadcast() {
    if (!this.state) return;
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as SocketAttachment;
      try {
        socket.send(
          JSON.stringify({
            type: "snapshot",
            data: roomSnapshot(this.state, attachment.playerId),
          }),
        );
      } catch {
        // Closed sockets are removed by the runtime.
      }
    }
  }

  private async settle() {
    if (!this.state || this.state.settled) return;
    const response = await fetch(`${this.env.SITE_URL}/api/room-results`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Room-Service-Secret": this.env.ROOM_SERVICE_SECRET,
      },
      body: JSON.stringify({
        roomId: this.state.code,
        gameType: this.state.gameType,
        gameNumber: this.state.gameNumber,
        results: roomSettlements(this.state),
      }),
    });
    if (!response.ok) throw new Error(`Settlement failed: ${response.status}`);
    this.state = { ...this.state, settled: true };
    await this.persist();
    this.broadcast();
  }
}

function corsHeaders(origin: string | null, env: Env) {
  const allowed =
    origin === env.SITE_ORIGIN || origin?.startsWith("http://localhost:");
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : env.SITE_ORIGIN,
    "Access-Control-Allow-Headers": "content-type, x-room-service-secret",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const headers = corsHeaders(request.headers.get("Origin"), env);
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (url.pathname === "/health")
      return Response.json({ ok: true }, { headers });
    const match = url.pathname.match(/^\/rooms\/([A-Z2-9]{6})\/(init|ws)$/);
    if (!match) return new Response("Not found", { status: 404, headers });
    const [, code, action] = match;
    const room = env.GAME_ROOMS.getByName(code);
    if (action === "init") {
      if (request.headers.get("X-Room-Service-Secret") !== env.ROOM_SERVICE_SECRET)
        return new Response("Unauthorized", { status: 401, headers });
      const body = await request.json<{
        hostId: string;
        hostName: string;
        gameType: RoomGameId;
        maxPlayers?: number;
      }>();
      await room.init(
        code,
        body.hostId,
        body.hostName,
        body.gameType,
        body.maxPlayers,
      );
      return Response.json({ code }, { headers });
    }
    const token = url.searchParams.get("token") ?? "";
    const identity = await verifyRoomToken(env.ROOM_SERVICE_SECRET, token);
    if (!identity || identity.room !== code)
      return new Response("Invalid room token", { status: 401, headers });
    const forwarded = new Request("https://room.internal/websocket", request);
    forwarded.headers.set("X-Player-Id", identity.playerId);
    forwarded.headers.set("X-Player-Name", identity.name);
    return room.fetch(forwarded);
  },
};
