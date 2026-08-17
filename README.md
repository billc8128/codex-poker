# Codex Poker

Codex Poker is a Codex plugin and ChatGPT Sites card-game app. It includes four solo tables against local strategy bots: three-player classic 斗地主, three-player 扎金花, six-max no-limit Texas Hold’em, and Blackjack. Mtok is a virtual score only—there is no purchase, deposit, withdrawal, exchange, or cash value.

Deployed Site: https://codex-poker.ccb8128.chatgpt.site

## Run locally

Requires Node.js 22.13+.

```bash
npm install
npm run dev
```

Open the URL printed by Vinext. Local development uses an explicit in-memory `Local guest` account; restarting the dev process resets that guest account. Production never falls back to the shared guest identity.

```bash
npm test
npm run lint
npm run build
npm run test:html
```

## Codex plugin

The plugin lives at `plugins/codex-poker`. Its MCP tool opens the deployed lobby or one named table:

```bash
codex plugin marketplace add .
codex plugin add codex-poker@codex-poker-local
```

Start a new Codex task after installation, then ask “Open the Codex Poker lobby” or “Start a Blackjack table.” To test a local server instead, temporarily override `CODEX_POKER_URL` in `plugins/codex-poker/.mcp.json`.

## ChatGPT Sites

The app uses the Sites Vinext plugin and logical D1 binding `DB`. The public lobby offers native Sign in with ChatGPT; production game and account routes require that identity. `app/chatgpt-auth.ts` reads the Sites-provided `oai-authenticated-user-*` headers, while local development alone may use the non-privileged guest identity.

Each stable Sites user ID maps to one `player_accounts` record with a 10,000 Mtok starting balance. D1 also stores an append-only game-result history. Every client settlement includes a UUID and the unique `(user_id, round_id)` index makes retries idempotent. The schema is in `db/schema.ts`; checked-in migrations are under `drizzle/`. Because gameplay runs locally in the browser and Mtok has no monetary value, this MVP treats the client result as trusted and does not provide an anti-cheat leaderboard.

## Implemented table rules

- Blackjack uses six decks, S17, 3:2 naturals, hit, stand, double and one split. Insurance and surrender are explicitly disabled table rules.
- Six-max no-limit Texas Hold’em implements six rotating positions, small/big blinds, four betting streets, fold/check/call/raise/all-in, main/side pots, split pots and full five-of-seven showdown comparison.
- 扎金花 implements blind/seen betting costs, call, raise, compare and fold. This table enables mixed-suit 235 beating trips and treats A23 as the lowest straight.
- 斗地主 uses 54 cards, 17/17/17 plus three kitty cards, 1–3 point bidding, all 13 documented combination families, pass/reset flow, bombs, rocket and multipliers.
- 斗地主 bots evaluate every legal move against the estimated number of turns remaining, preserve bombs/rocket and hand structures, cooperate as farmers, and increase defensive pressure in endgames. They are local heuristic search bots, not remote LLM calls.
- 德州扑克的五名 AI 使用不同松紧与激进倾向，并结合牌力、底池压力和少量确定性扰动做出策略选择；它们同样是本地可测试策略，不是远程 LLM 调用。
- Game logic is isolated under `lib/games`; UI state is in the table client component. The current AI boundary can later be replaced by multiplayer actors without moving rules into the UI.

The exact rule contract and source references are in `docs/RULES.md`. `npm test` covers hand ranking, legal/illegal actions and a complete game path for every table.
