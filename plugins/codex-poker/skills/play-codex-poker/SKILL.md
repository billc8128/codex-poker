---
name: play-codex-poker
description: Open the deployed Codex Poker lobby or one of its four virtual-point card tables when the user asks to play Codex Poker, 斗地主, 扎金花, 德州扑克, Texas Hold'em, Blackjack, or 21点.
---

# Play Codex Poker

Use the `open_poker` MCP tool with no game to open the lobby. When the user names a solo game, pass exactly one of `doudizhu`, `zhajinhua`, `holdem`, or `blackjack`. When the user asks to create or join a multiplayer room, pass `multiplayer: true`; when they provide a six-character invite code, pass it as `roomCode`.

Tell the user that Mtok is a virtual score with no purchase, withdrawal, exchange, or cash value. The MCP tool creates a short-lived signed launch link so the deployed table opens inside Codex with a separate persistent plugin balance and history; do not send the user through an external browser login.
