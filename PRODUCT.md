# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Codex and ChatGPT users who want to open a quick, understandable card game from a plugin or task and play a complete round against AI without configuring a multiplayer room.

## Product Purpose

Codex Poker provides four rules-based solo and multiplayer card tables—斗地主、扎金花、六人德州扑克和 21 点—with clear legal actions, visible state changes, AI fill, private-room invitations, reconnectable play, and complete settlement. Success means a first-time player can understand who acted, what cards matter, what they may do next, and when the round is over.

## Positioning

The game launches directly from Codex/ChatGPT while retaining a dedicated, fully interactive table UI. It uses only virtual Mtok score and has no purchase, withdrawal, exchange, or cash value.

## Operating Context

The primary surface runs in the Codex in-app browser, including compact desktop-height and mobile-width viewports. Players repeatedly scan opponent state, table state, their own cards, and the legal-action rail.

## Capabilities and Constraints

- Exact table rules are authoritative in `docs/RULES.md`.
- Core rules and state transitions remain in pure modules under `lib/games`.
- Sites supplies optional ChatGPT identity and logical D1 persistence; local development falls back to a guest identity.
- Future真人联机 may replace AI actors, but rules cannot move into UI components.

## Brand Commitments

The user requested a restrained, modern black-and-white interface close to the Codex/ChatGPT desktop app, with a distinct color for each game. Information clarity and playable cards outrank decorative casino imagery.

## Evidence on Hand

- User-provided failure screenshot: `/var/folders/gq/tm7_y1js0nd03vjg61sb_66c0000gn/T/codex-clipboard-2a2413d2-5ca3-4f67-a93c-9255c74c30ce.png`.
- Rule contract: `docs/RULES.md`.
- Browser review captures: `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png`.

## Product Principles

- Never hide a legal action or silently reject an illegal one.
- Attribute every consequential action to a named player.
- Show real card faces where identity matters and compact counts where secrecy matters.
- A game is complete only after a full browser-played round and explicit settlement.

## Accessibility & Inclusion

Controls require visible keyboard focus, legible contrast, and usable touch targets. Color is never the sole carrier of rank, suit, role, legality, or turn state.
