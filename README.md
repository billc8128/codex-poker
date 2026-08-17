# Codex Poker

Codex Poker is a local-first card-game MVP for Codex/ChatGPT. It includes four solo tables against deterministic local strategy bots: three-player classic 斗地主, three-player 扎金花, heads-up no-limit Texas Hold’em, and Blackjack. Mtok is a virtual score only—there is no purchase, deposit, withdrawal, exchange, or cash value.

## Run locally

Requires Node.js 22.13+.

```bash
npm install
npm run dev
```

Open the URL printed by Vinext (normally `http://localhost:3000`). Local development uses the explicit `Local guest` identity. The guest score is stored in local Miniflare D1.

```bash
npm test
npm run lint
npm run build
```

## Codex plugin

The plugin lives at `plugins/codex-poker`. Its MCP tool opens the lobby or one named table. Keep the site running, then install the repository marketplace and plugin:

```bash
codex plugin marketplace add .
codex plugin add codex-poker@codex-poker-local
```

Start a new Codex task after installation, then ask “Open the Codex Poker lobby” or “Start a Blackjack table.” The MCP URL defaults to port 3000; update `CODEX_POKER_URL` in `plugins/codex-poker/.mcp.json` if Vinext selected another port.

## ChatGPT Sites

The app uses the Sites Vinext plugin and declares logical D1 binding `DB` in `.openai/hosting.json`. `app/chatgpt-auth.ts` reads the Sites-provided `oai-authenticated-user-*` headers. On Sites, the lobby uses the native `/signin-with-chatgpt` and `/signout-with-chatgpt` routes; locally, missing identity headers safely fall back to the non-privileged guest identity.

The score adapter uses D1 through prepared statements. The schema is in `db/schema.ts` and the checked-in SQL migration is `drizzle/0000_game_results.sql`. No production database or public deployment is created by this repository.

## Implemented table rules

- Blackjack uses six decks, S17, 3:2 naturals, hit, stand, double and one split. Insurance and surrender are explicitly disabled table rules.
- Six-max no-limit Texas Hold’em implements six rotating positions, small/big blinds, four betting streets, fold/check/call/raise/all-in, main/side pots, split pots and full five-of-seven showdown comparison.
- 扎金花 implements blind/seen betting costs, call, raise, compare and fold. This table enables mixed-suit 235 beating trips and treats A23 as the lowest straight.
- 斗地主 uses 54 cards, 17/17/17 plus three kitty cards, 1–3 point bidding, all 13 documented combination families, pass/reset flow, bombs, rocket and multipliers.
- 斗地主 bots evaluate every legal move against the estimated number of turns remaining, preserve bombs/rocket and hand structures, cooperate as farmers, and increase defensive pressure in endgames. They are local heuristic search bots, not remote LLM calls.
- 德州扑克的五名 AI 使用不同松紧与激进倾向，并结合牌力、底池压力和少量确定性扰动做出策略选择；它们同样是本地可测试策略，不是远程 LLM 调用。
- Game logic is isolated under `lib/games`; UI state is in the table client component. The current AI boundary can later be replaced by multiplayer actors without moving rules into the UI.

The exact rule contract and source references are in `docs/RULES.md`. `npm test` covers hand ranking, legal/illegal actions and a complete game path for every table.
