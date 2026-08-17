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
const secret = envFile.match(/^PLUGIN_LAUNCH_SECRET=(.+)$/m)?.[1];
assert.ok(secret);

const cookieFor = (sub) => {
  const body = Buffer.from(
    JSON.stringify({ sub, kind: "session", exp: Math.floor(Date.now() / 1000) + 300 }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `codex_poker_plugin_session=${body}.${signature}`;
};
const waitFor = async (condition, label, timeout = 8000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await condition();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${label}`);
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
async function connect(url) {
  const client = { socket: new WebSocket(url), snapshot: null, errors: [] };
  client.socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "snapshot") client.snapshot = message.data;
    else client.errors.push(message.message);
  };
  await new Promise((resolve, reject) => {
    client.socket.onopen = resolve;
    client.socket.onerror = reject;
  });
  await waitFor(() => client.snapshot, "snapshot");
  return client;
}

const results = [];
for (const [gameType, maxPlayers] of [
  ["doudizhu", 3],
  ["zhajinhua", 3],
  ["holdem", 6],
  ["blackjack", 3],
]) {
  const cookie = cookieFor(`ai-e2e-${gameType}`);
  const created = await json("/api/rooms", cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gameType, maxPlayers }),
  });
  const credential = await json(`/api/rooms/${created.code}/token`, cookie);
  const client = await connect(credential.websocketUrl);
  client.socket.send(JSON.stringify({ type: "ready", ready: true }));
  client.socket.send(JSON.stringify({ type: "fill-bots" }));
  await waitFor(
    () => client.snapshot.players.length === maxPlayers && client.snapshot.players.every((p) => p.ready),
    `${gameType} bots`,
  );
  client.socket.send(JSON.stringify({ type: "start", seed: 33 }));
  await waitFor(
    () => client.snapshot.phase === "playing" || client.snapshot.phase === "done",
    `${gameType} start`,
  );
  let turns = 0;
  while (client.snapshot.phase !== "done" && turns++ < 100) {
    const game = client.snapshot.game;
    const version = client.snapshot.version;
    if (game.type === "doudizhu") {
      if (game.phase === "bidding")
        client.socket.send(JSON.stringify({ type: "bid", bid: 3 }));
      else {
        const legal = generateDoudizhuPlays(game.myHand)
          .filter((cards) =>
            canBeatDoudizhu(
              classifyDoudizhu(cards),
              game.target?.combo ?? null,
            ),
          )
          .sort((a, b) => b.length - a.length);
        client.socket.send(
          JSON.stringify(
            legal.length
              ? { type: "play", cardIds: legal[0].map((card) => card.id) }
              : { type: "pass" },
          ),
        );
      }
    } else if (game.type === "zhajinhua") {
      client.socket.send(
        JSON.stringify(
          game.round >= 2
            ? {
                type: "zjh",
                action: "compare",
                value: game.active[1] ? 1 : 2,
              }
            : { type: "zjh", action: "call" },
        ),
      );
    } else if (game.type === "holdem") {
      const player = game.players[0];
      const toCall = Math.max(0, game.currentBet - player.streetBet);
      client.socket.send(
        JSON.stringify({ type: "holdem", action: toCall ? "call" : "check" }),
      );
    } else {
      client.socket.send(JSON.stringify({ type: "blackjack", action: "stand" }));
    }
    await waitFor(() => client.snapshot.version > version, `${gameType} turn`);
    if (client.errors.length) throw new Error(client.errors.join(", "));
  }
  assert.equal(client.snapshot.phase, "done", `${gameType} should finish`);
  client.socket.close();
  results.push({ gameType, turns, room: created.code });
}

console.log(JSON.stringify({ status: "passed", games: results }));
