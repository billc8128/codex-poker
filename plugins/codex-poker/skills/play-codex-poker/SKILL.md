---
name: play-codex-poker
description: Open the Codex Poker lobby or one of its four local virtual-point card tables when the user asks to play Codex Poker, 斗地主, 扎金花, 德州扑克, Texas Hold'em, Blackjack, or 21点.
---

# Play Codex Poker

Use the `open_poker` MCP tool with no game to open the lobby. When the user names a game, pass exactly one of `doudizhu`, `zhajinhua`, `holdem`, or `blackjack`.

Tell the user that Mtok is a virtual score with no purchase, withdrawal, exchange, or cash value. If the local site is not running, ask them to start it from the Codex Poker project with `npm run dev`, then call the tool again.
