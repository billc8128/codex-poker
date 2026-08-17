import { createHmac, randomUUID } from "node:crypto";
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
const secretPath = join(stateDirectory, "launch-secret");
const slugs = new Set(["doudizhu", "zhajinhua", "holdem", "blackjack"]);

function readOrCreateAccountId() {
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  if (!existsSync(accountPath))
    writeFileSync(accountPath, `${randomUUID()}\n`, { mode: 0o600 });
  return readFileSync(accountPath, "utf8").trim();
}

function launchSecret() {
  const secret = process.env.CODEX_POKER_LAUNCH_SECRET?.trim() ??
    (existsSync(secretPath) ? readFileSync(secretPath, "utf8").trim() : "");
  if (!secret)
    throw new Error("Codex Poker plugin session is not configured");
  return secret;
}

function launchToken() {
  const payload = Buffer.from(
    JSON.stringify({
      sub: readOrCreateAccountId(),
      kind: "launch",
      exp: Math.floor(Date.now() / 1000) + 60 * 5,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", launchSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
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
        "Open the Codex Poker lobby or a specific virtual-point game table.",
      inputSchema: {
        type: "object",
        properties: {
          game: {
            type: "string",
            enum: [...slugs],
            description: "Optional game to open.",
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "open_poker") throw new Error("Unknown tool");
  const game = request.params.arguments?.game;
  const returnTo = game && slugs.has(game) ? `/play/${game}` : "/";
  const url = `${base}/plugin-login?token=${encodeURIComponent(launchToken())}&return_to=${encodeURIComponent(returnTo)}`;
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
