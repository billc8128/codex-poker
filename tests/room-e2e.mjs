import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  canBeatDoudizhu,
  classifyDoudizhu,
  generateDoudizhuPlays,
} from "../lib/games/doudizhu.ts";

const site = process.env.CODEX_POKER_TEST_URL ?? "http://localhost:3001";
const envFile = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const pluginSecret = envFile.match(/^PLUGIN_LAUNCH_SECRET=(.+)$/m)?.[1];
assert.ok(pluginSecret, "PLUGIN_LAUNCH_SECRET is missing");

const sessionCookie = (sub) => {
  const body = Buffer.from(
    JSON.stringify({
      sub,
      kind: "session",
      exp: Math.floor(Date.now() / 1000) + 300,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", pluginSecret)
    .update(body)
    .digest("base64url");
  return `codex_poker_plugin_session=${body}.${signature}`;
};

async function json(path, cookie, init = {}) {
  const response = await fetch(`${site}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), cookie },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const waitFor = async (condition, label, timeout = 5000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await condition();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

async function connect(url) {
  const client = { socket: new WebSocket(url), snapshot: null, errors: [] };
  client.socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "snapshot") client.snapshot = message.data;
    if (message.type === "error") client.errors.push(message.message);
  };
  await new Promise((resolve, reject) => {
    client.socket.onopen = resolve;
    client.socket.onerror = reject;
  });
  await waitFor(() => client.snapshot, "initial room snapshot");
  return client;
}

const cookies = ["e2e-player-0", "e2e-player-1", "e2e-player-2"].map(
  sessionCookie,
);
const initialBalances = await Promise.all(
  cookies.map((cookie) => json("/api/results", cookie)),
);
const created = await json("/api/rooms", cookies[0], {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ gameType: "doudizhu", maxPlayers: 3 }),
});
assert.match(created.code, /^[A-Z2-9]{6}$/);
const credentials = await Promise.all(
  cookies.map((cookie) => json(`/api/rooms/${created.code}/token`, cookie)),
);
const clients = await Promise.all(
  credentials.map(({ websocketUrl }) => connect(websocketUrl)),
);
await waitFor(
  () => clients[0].snapshot?.players.length === 3,
  "all three players",
);

clients.forEach((client) =>
  client.socket.send(JSON.stringify({ type: "ready", ready: true })),
);
await waitFor(
  () => clients[0].snapshot?.players.every((player) => player.ready),
  "all players ready",
);
clients[0].socket.send(JSON.stringify({ type: "start", seed: 115 }));
await waitFor(
  () => clients.every((client) => client.snapshot?.phase === "playing"),
  "authoritative game start",
);
assert.deepEqual(clients[0].snapshot.game.handCounts, [17, 17, 17]);
assert.ok(clients.every((client) => client.snapshot.game.myHand.length === 17));

const bidderSeat = clients[0].snapshot.game.currentPlayer;
const bidder = clients.find((client) => client.snapshot.me.seat === bidderSeat);
bidder.socket.send(JSON.stringify({ type: "bid", bid: 3 }));
await waitFor(
  () => clients.every((client) => client.snapshot?.game?.phase === "playing"),
  "bidding completion",
);
assert.equal(clients[0].snapshot.game.landlord, bidderSeat);

const reconnectSeat = clients[1].snapshot.me.seat;
clients[1].socket.close();
await waitFor(
  () =>
    clients[0].snapshot.players.find((player) => player.seat === reconnectSeat)
      ?.connected === false,
  "disconnect broadcast",
);
const reconnected = await connect(credentials[1].websocketUrl);
await waitFor(
  () => reconnected.snapshot.me.seat === reconnectSeat,
  "seat-preserving reconnect",
);

const activeClients = [clients[0], reconnected, clients[2]];
let turns = 0;
while (activeClients[0].snapshot.phase !== "done" && turns++ < 250) {
  const game = activeClients[0].snapshot.game;
  const actor = activeClients.find(
    (client) => client.snapshot.me.seat === game.currentPlayer,
  );
  assert.ok(actor, "current player must have an active connection");
  const legal = generateDoudizhuPlays(actor.snapshot.game.myHand)
    .filter((cards) =>
      canBeatDoudizhu(
        classifyDoudizhu(cards),
        actor.snapshot.game.target?.combo ?? null,
      ),
    )
    .sort((a, b) => b.length - a.length);
  const version = activeClients[0].snapshot.version;
  actor.socket.send(
    JSON.stringify(
      legal.length
        ? { type: "play", cardIds: legal[0].map((card) => card.id) }
        : { type: "pass" },
    ),
  );
  await waitFor(
    () => activeClients[0].snapshot.version > version,
    `turn ${turns}`,
  );
}
assert.equal(activeClients[0].snapshot.phase, "done");
assert.ok(turns < 250);

const finalBalances = await waitFor(async () => {
  const balances = await Promise.all(
    cookies.map((cookie) => json("/api/results", cookie)),
  );
  return balances.some(
    (account, index) => account.balance !== initialBalances[index].balance,
  )
    ? balances
    : null;
}, "room settlement", 8000);
assert.equal(
  finalBalances.reduce((total, account) => total + account.balance, 0),
  initialBalances.reduce((total, account) => total + account.balance, 0),
);

await waitFor(
  () => activeClients.every((client) => client.snapshot?.settled === true),
  "settlement broadcast",
);
const seatsBeforeReplay = activeClients[0].snapshot.players.map(
  ({ id, seat, isBot }) => ({ id, seat, isBot }),
);
activeClients[0].socket.send(JSON.stringify({ type: "start", seed: 116 }));
await waitFor(
  () =>
    activeClients.every(
      (client) =>
        client.snapshot?.phase === "playing" &&
        client.snapshot?.gameNumber === 2,
    ),
  "second game start",
);
assert.deepEqual(
  activeClients[0].snapshot.players.map(({ id, seat, isBot }) => ({ id, seat, isBot })),
  seatsBeforeReplay,
);

await Promise.all(
  activeClients.map(
    (client) =>
      new Promise((resolve) => {
        client.socket.onclose = resolve;
        client.socket.close();
        setTimeout(resolve, 500);
      }),
  ),
);
console.log(
  JSON.stringify({
    room: created.code,
    players: 3,
    landlord: bidderSeat,
    reconnectSeat,
    turns,
    gamesStarted: activeClients[0].snapshot.gameNumber,
    balances: finalBalances.map((account) => account.balance),
    status: "passed",
  }),
);
