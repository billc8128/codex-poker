import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const base = (
  process.env.CODEX_POKER_URL ?? "https://codex-poker.ccb8128.chatgpt.site"
).replace(/\/$/, "");
const stateDirectory =
  process.env.CODEX_POKER_STATE_DIR ?? join(homedir(), ".codex", "codex-poker");
const accountPath = join(stateDirectory, "account-id");
const slugs = new Set(["doudizhu", "zhajinhua", "holdem", "blackjack"]);

function readOrCreateAccountId() {
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  if (!existsSync(accountPath))
    writeFileSync(accountPath, `${randomUUID()}\n`, { mode: 0o600 });
  return readFileSync(accountPath, "utf8").trim();
}

async function requestLaunchUrl(returnTo) {
  const response = await fetch(`${base}/api/plugin-launch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      installationId: readOrCreateAccountId(),
      returnTo,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || typeof body?.launchUrl !== "string")
    throw new Error(body?.error ?? "Codex Poker launch service is unavailable");
  return body.launchUrl;
}

const server = new Server(
  { name: "codex-poker", version: "0.3.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "open_poker",
      description:
        "Open the Codex Poker lobby, multiplayer rooms, an invite code, or a specific virtual-point game table.",
      inputSchema: {
        type: "object",
        properties: {
          game: {
            type: "string",
            enum: [...slugs],
            description: "Optional game to open.",
          },
          multiplayer: {
            type: "boolean",
            description: "Open the multiplayer room lobby.",
          },
          roomCode: {
            type: "string",
            pattern: "^[A-Z2-9]{6}$",
            description: "Optional six-character multiplayer invite code.",
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "open_poker") throw new Error("Unknown tool");
  const game = request.params.arguments?.game;
  const roomCode = String(request.params.arguments?.roomCode ?? "").toUpperCase();
  const returnTo = /^[A-Z2-9]{6}$/.test(roomCode)
    ? `/room/${roomCode}`
    : request.params.arguments?.multiplayer
      ? "/rooms"
      : game && slugs.has(game)
        ? `/play/${game}`
        : "/";
  const url = await requestLaunchUrl(returnTo);
  return {
    content: [
      {
        type: "resource_link",
        uri: url,
        name: game ? `Open ${game}` : "Open Codex Poker",
        description:
          "Opens a private Codex plugin account. Virtual Mtok points only; no cash value.",
        mimeType: "text/html",
      },
    ],
  };
});

await server.connect(new StdioServerTransport());
