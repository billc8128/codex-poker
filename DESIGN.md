---
name: Codex Poker
description: "An open three-seat card table where position, scale, and one decisive motion make play legible."
colors:
  ink: "#121212"
  paper: "#f2f2ef"
  paper-action: "#f4f4ef"
  guide-paper: "#f5f5f2"
  line: "#d3d3ce"
  table-ink: "#17243f"
  table-ink-translucent: "#17243fcc"
  table-ink-hover: "#263654"
  table-label: "#aeb9cc"
  table-label-strong: "#c4cddd"
  card-face: "#f9f9f5"
  card-ink: "#171717"
  suit-red: "#c43c36"
  action-amber: "#f2c94c"
  white: "#ffffff"
typography:
  headline:
    fontFamily: "var(--font-sans), sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "normal"
  title:
    fontFamily: "var(--font-sans), sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "var(--font-sans), sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-mono), monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
  control:
    fontFamily: "var(--font-mono), monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  card-rank:
    fontFamily: "var(--font-sans), sans-serif"
    fontSize: "18px"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  count-stack: "4px"
  card: "8px"
  guide: "18px"
  table-mobile: "24px"
  table-seam: "28px"
  table: "36px"
  pill: "999px"
spacing:
  micro: "4px"
  compact: "8px"
  control: "12px"
  base: "16px"
  shell: "20px"
  roomy: "24px"
  seat: "34px"
  stage: "48px"
components:
  table-navigation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    padding: "0"
    width: "100%"
    height: "52px"
  table-field:
    backgroundColor: "{colors.table-ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.table}"
    padding: "0"
    width: "100%"
  action-primary:
    backgroundColor: "{colors.paper-action}"
    textColor: "{colors.card-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "11px 16px"
    height: "auto"
  action-secondary:
    backgroundColor: "{colors.table-ink-translucent}"
    textColor: "{colors.white}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "11px 16px"
    height: "auto"
  playing-card:
    backgroundColor: "{colors.card-face}"
    textColor: "{colors.card-ink}"
    typography: "{typography.card-rank}"
    rounded: "{rounded.card}"
    padding: "7px"
    width: "clamp(64px, 6vw, 78px)"
    height: "clamp(92px, 8.4vw, 110px)"
  winning-card:
    backgroundColor: "{colors.card-face}"
    textColor: "{colors.card-ink}"
    typography: "{typography.card-rank}"
    rounded: "{rounded.card}"
    padding: "7px"
    width: "68px"
    height: "94px"
  rules-guide:
    backgroundColor: "{colors.guide-paper}"
    textColor: "{colors.card-ink}"
    rounded: "{rounded.guide}"
    padding: "30px"
    width: "min(480px, 100%)"
---

# Design System: Codex Poker

## Overview

**Creative North Star: "The Table Is the Interface"**

Codex Poker opens from a quiet paper utility bar into one uninterrupted deep-ink field. The field is not a container for dashboard modules: the three-seat topology, the location of each latest play, the scale of the winning cards, and the curve of the hero hand communicate the round directly.

The world is restrained and physical. Ivory cards, black and vermilion suits, quiet seat names, and one amber signal are enough. Administrative chrome stays at the perimeter, while the cards and their movement own the center. The result should feel like a real tabletop seen through Codex—not a casino simulation and not a collection of UI panels.

**Key Characteristics:**

- One uninterrupted deep-ink table inside minimal paper utility chrome.
- Two opponents floating across the upper corners and the hero anchored low-left.
- Every seat's latest cards placed in the open field directly beside that seat.
- A larger central winning play that is unmistakably the current target.
- A broad desktop fan that becomes a fixed multi-row mobile grid without changing card identity.
- Direct manipulation across the whole playable hand: click a card or sweep a continuous range to select or deselect it.
- A face-up 17-card bidding review hand that reuses the same responsive geometry without enabling card interaction.
- Amber reserved for turn, selection, focus, multiplier, and the smallest necessary attention cues.
- Serialized turn feedback: the completed action appears before the next actor begins thinking.
- One throw-to-table motion that explains a new leading play, with a static reduced-motion result and no replay on passes.

## Colors

The palette behaves like ink, paper, and playing cards: one dark field, warm pale chrome, high-contrast faces, quiet blue-gray metadata, and two scarce semantic accents.

### Primary

- **Deep Table Ink:** The uninterrupted playing field and translucent control-dock base. It is the dominant visual mass.
- **Codex Paper:** The utility shell and the centered mobile rules control; it keeps the product frame light and familiar.

### Secondary

- **Card Ivory:** Every face-up card. Keeping cards warmer and brighter than pure white makes them read as physical objects.
- **Quiet Table Slate:** Seat metadata, state copy, and the winning-player attribution. Strong slate is used when metadata must hold against the field.

### Tertiary

- **Action Amber:** Turn rings, selected-card outlines, keyboard focus, the hero marker, and multiplier emphasis.
- **Suit Vermilion:** Hearts, diamonds, and the red joker mark. Suit symbols preserve the same meaning without relying on hue alone.

### Neutral

- **Codex Ink:** Utility text and the darkest action/card copy.
- **Paper Action:** The preferred legal action on the dark field.
- **Guide Paper:** The slightly warmer blocking rules surface.
- **Hairline:** The single utility divider and the mobile paper-control border.
- **Pure White:** Strong table text, focus outlines on ordinary card hover, and the brightest table seam.

### Named Rules

**The Open Field Rule.** The table is a single continuous color; do not insert light trays, opaque panels, or a second surface behind seat plays or the current trick.

**The Amber Means Attention Rule.** Amber marks turn, selection, focus, multiplier, or the hero identity. Never spend it on passive decoration.

## Typography

**Display Font:** Geist / the configured sans family (with sans-serif fallback)  
**Body Font:** Geist / the configured sans family (with sans-serif fallback)  
**Label/Mono Font:** Geist Mono / the configured mono family (with monospace fallback)

**Character:** Sans-serif names and card values are direct and human; monospace labels make counts, roles, utilities, and controls feel precise. The table avoids oversized display typography so cards remain the loudest objects.

### Hierarchy

- **Headline** (650, 20px, 1): The open-table prompt when a fresh trick begins.
- **Title** (650, 14px, 1): The winning combination and other primary table-state labels.
- **Body** (400, 14px, 1.55): Rules-guide explanation and instructional copy.
- **Label** (600, 10px, 0.06em): Utility navigation, seat roles, card counts, round marks, attribution, and supporting state.
- **Control** (600, 11px, 1): Pill actions and utility controls.
- **Card Rank** (750, 18px, 1): Desktop fan and winning-card corners; compact cards scale this role down while preserving weight.

### Named Rules

**The Cards Speak Loudest Rule.** Keep table labels compact and quiet; hierarchy comes first from card scale and placement, then from type.

## Layout

The table shell fills the dynamic viewport with a 520px minimum height. The shipped tabletop uses a 52px paper utility bar, 20px desktop side gutters, an 18px bottom gutter, and a flexible rounded field that occupies the remaining height. Status and actions float over the field at its lower edge instead of forming a separate rail.

At the 1280 × 800 desktop target, AI seats float 34px from the left and right edges near the top. Their latest cards sit immediately below the corresponding name and hidden-card count. The winning play is centered at 43% of the field height. Hero identity sits above the lower-left hand edge; the fan spans most of the bottom width, while status and legal actions occupy opposite corners.

During an AI turn, a compact thinking badge sits at 20% of the field height, safely above the winning-card anchor. It may combine the immediately completed pass with the next thinker—such as “AI 1 过牌 · AI 2 思考中…”—so the table never erases cause while announcing what follows.

At 700px and below, the shell gutters become 8px and the field curve tightens. Opponents move to 15px edge offsets, the winning play rises to 39%, hero identity lifts above the hand, and the Dou Dizhu hand becomes a fixed grid with one independent tap column per card. At widths up to 479px—including the 390 × 844 target—the grid uses 8 columns × 3 rows with 44 × 60px cards and at least 44px of independent tap width. From 480–700px, it uses 10 columns × 2 rows with 48 × 66px cards; at the 480px breakpoint, the available columns are approximately 44.4px wide or greater. Both grids remain fully visible with no horizontal scrollbar and no clipping. Actions keep 44px minimum touch height, and status sits immediately above the dock.

The playable hand keeps the same continuous index order in the desktop fan and both mobile grids. A drag may cross mobile rows without restarting the gesture or skipping cards; the inclusive range between the start card and the nearest current card is always the selection range.

Desktop viewports at least 1000px high center a fixed 980px active stage inside the taller field. Seat, winner, hero, and hand geometry all anchor to that stage; winning cards grow to 94 × 130px and hand cards to 90 × 126px instead of drifting apart with the viewport. Desktop heights of 680px or less compress seat, winner, hero, and hand offsets while preserving the same topology.

During Dou Dizhu bidding, the center holds three patterned card backs, the current high bid, and chronological bid history while the player's complete 17-card hand remains face-up below. The review hand reuses the desktop fan at a raised 90px bottom offset so it clears the bidding controls; on mobile it reuses the same 8-column or 10-column grid. The cards are view-only in both modes.

Approved mobile evidence is captured at `.impeccable/review/mobile-grid-390.png`, `.impeccable/review/mobile-grid-selected.png`, and `.impeccable/review/mobile-grid-540.png`.

**The Three Anchors Rule.** Every responsive mode preserves opponents above, winning play at center, and hero hand below. Density may change; the causal reading order may not.

## Elevation & Depth

Depth is physical and sparse. The table receives one broad ambient lift from the paper shell; cards receive progressively stronger shadows as they move from seat history to the winning play to the interactive fan. Seat labels, counts, messages, and controls do not become floating cards.

### Shadow Vocabulary

- **Table Float** (`inset 0 0 0 1px #ffffff18, 0 22px 50px #1118271c`): Separates the single field from the paper shell.
- **Seat Throw** (`0 6px 16px #07102a52`): Keeps latest seat cards readable at compact scale.
- **Winning Play** (`0 12px 28px #07102a66`): Gives the current target more physical authority than seat history.
- **Fan Card** (`0 10px 22px #07102a66`): Separates overlapping hand cards while preserving the fan silhouette.
- **Selected Fan Card** (`0 16px 30px #07102a80`): Supports the larger selected lift and amber outline.
- **Rules Guide** (`0 24px 80px #0006`): The only blocking elevation, paired with a dark blurred backdrop.

### Named Rules

**The Depth Follows Importance Rule.** Seat history is shallow, the current winner is stronger, and the selectable hand is strongest. Never use elevation to turn metadata into containers.

## Shapes

The large field has a generous 36px desktop curve with a quiet inset seam; mobile tightens it to 24px. Cards are crisp 8px rectangles in the fan and winning play, while compact seat throws retain smaller corners. Player tokens, pass states, help, and actions are pills. The geometry should read as one room, three occupants, and many physical cards—not nested boxes.

## Components

### Utility Navigation

- **Structure:** A 52px three-column paper bar for lobby return, current game/solo status, and balance.
- **Style:** Compact mono text, one hairline below, and no raised container treatment.
- **Mobile:** Collapses to two columns and hides only the redundant centered status.

### Floating Seats

- **Identity:** A 42px pill token, player name or role, and an adjacent hidden-card count stack.
- **Turn:** The active seat gains an amber token border and restrained outer ring; the role text remains present.
- **Topology:** AI 1 reads left-to-right; AI 2 mirrors the composition so both point inward toward the table.

### Seat-Anchored Latest Cards

- **Placement:** Latest face-up cards sit directly beneath their actor, in the open field, with no enclosing tray.
- **Scale:** Desktop cards are 45 × 62px and overlap slightly; mobile cards become 37 × 52px. A pass uses a high-contrast white label, visible translucent fill, and stronger white outline in the same location.
- **Attribution:** Proximity to the seat is the attribution mechanism; do not duplicate the cards into a history module.

### Central Winning Play

- **Hierarchy:** The current target is the largest face-up play in the field, accompanied by compact actor/role attribution and combination text.
- **Scale:** Default cards are 68 × 94px; tall-stage cards are 94 × 130px. Multiple cards use a visible 6px gap rather than dense overlap.
- **Empty State:** A simple two-line “new trick / who leads” prompt occupies the same center anchor.
- **Motion Identity:** The throw is keyed by the target player plus the target card IDs. A pass changes turn feedback without remounting or replaying the previous winning-card throw.

### Fan Hand

- **Desktop:** Cards are absolutely positioned around a shallow arc using lateral offset, rotation, and a dropped outer edge. The fan spans most of the field width.
- **Unified Pointer Surface:** During the player's turn in the playing phase, the hand container owns pointer input for the complete fan or grid. Visual card buttons ignore pointer hit-testing so overlap cannot redirect a gesture, but remain native focusable buttons with `aria-pressed` and keyboard click behavior.
- **Immediate Selection:** Primary-pointer or left-button down selects the nearest card immediately and captures the pointer. Right- and middle-button input do nothing.
- **Continuous Range:** Card centers are frozen at drag start, nearest-card geometry chooses the current index, and the inclusive range from the starting index is applied against an immutable copy of the pre-drag selection. Starting on an unselected card selects the range; starting on a selected card deselects it. This keeps the gesture stable when selected cards lift and supports reversal within one drag.
- **Hover / Focus:** Idle pointer hover uses card centers cached on pointer-enter and lifts the nearest unselected card 14px with a white outline. Keyboard focus receives the same visible treatment. Selection lifts 24px with an amber outline and stronger shadow.
- **Mobile:** Cards stop rotating and occupy independent, non-overlapping grid columns: 8 columns × 3 rows with 44 × 60px cards through 479px, then 10 columns × 2 rows with 48 × 66px cards from 480–700px. The grid must not scroll or clip. The same nearest-card range logic continues across rows. Selection lifts 8px with a 2px amber outline.
- **Availability:** One shared eligibility condition—playing phase plus player turn—controls the pointer surface, handlers, card click, hover treatment, and gesture hint. State updates and round reset clear drag, hover, and selection. AI turns, bidding, and terminal states retain a visibly disabled hand with no pointer affordance.
- **Bidding:** All 17 player cards are face-up before any decision. The same desktop fan and responsive mobile grid are disabled and view-only, so bidding never triggers hover, focus, selection, or card-play behavior. The desktop variant sits 90px above the bottom edge to avoid the bidding controls.

**The Hand Is One Hit Surface Rule.** Pointer selection belongs to the playable hand container; card buttons preserve semantic keyboard interaction without competing for overlapping pointer hits.

### Bidding Stage

- **Kitty:** All three cards remain patterned backs until bidding resolves; only the player's 17-card hand is revealed.
- **Prompt:** The hand label explicitly says “你的 17 张手牌 · 看牌后决定是否叫分,” making card review the prerequisite to bidding.
- **Order:** The first bidder is deterministic-random for each deal. If an AI starts, its bids auto-advance until the user can act, while every completed bid remains visible in chronological history.
- **Controls:** Illegal scores remain disabled, and the visible history plus current-highest summary must agree with the actions that already auto-resolved.

### Action Dock

- **Secondary:** A translucent deep-ink pill with a quiet white border and blurred field beneath.
- **Primary:** A warm paper pill with dark ink, used for the preferred legal action.
- **State:** During AI turns, hand cards and the visible pass/play actions remain present but disabled; control returns when the player turn resumes. Disabled controls use reduced opacity, keyboard focus uses the amber outline, and mobile targets are at least 44px tall.
- **Placement:** Status anchors bottom-left and legal actions bottom-right on desktop; mobile compacts both against the lower field edge.

### AI Turn Sequencing

- **Cadence:** A player action renders immediately. Each AI then advances exactly one action through `stepDoudizhuAi` after a 900ms delay, allowing AI 1's pass to remain visible before AI 2 begins thinking.
- **Completion Copy:** The second consecutive pass explicitly names the player who re-leads; the table then restores that player's controls when applicable.
- **Status:** The persistent polite `role="status"` announcement combines the completed action with the next AI thinker instead of replacing one with the other.
- **Thinking Motion:** The 150ms ease-out scale/fade is an acknowledgement, not a looping loader. Reduced motion removes this animation entirely.
- **Interruption:** Opening the blocking rules guide pauses the AI timer. Closing it resumes the pending turn with a fresh delay.

**The One Beat Rule.** Commit and show one actor's result before scheduling the next actor; never collapse multiple AI decisions into one render.

### Six-max Hold'em Ring

- **Topology:** Five AI seats occupy the three upper and two middle perimeter positions; the hero remains centered at the lower edge. The five-card board and pot stay on the table axis.
- **Identity:** Every AI exposes a stable strategy name plus D/SB/BB position when applicable. The latest action stays beside that seat, so folds, calls and raises remain attributable.
- **Cards:** Opponent cards stay compact and face-down during play. At showdown only non-folded hands turn face-up; folded hands remain dimmed and hidden.
- **Turn:** Amber marks the acting seat and the hero cards without introducing another panel. Mobile compresses opponent cards while preserving all six seats, the complete board and 44px actions in one viewport.

### Multiplayer Room

- **Creation:** One compact creation surface exposes game type and valid seat counts before the primary create action. Joining by six-character code remains a separate, equally legible path.
- **Mixed seats:** Every seat names its human/AI status, readiness and connection state. Hosts receive exactly three lobby controls: remove AI, fill AI and start.
- **Game continuity:** The room preserves the same table color assigned to each game while keeping invite, room code and connection state in paper utility chrome.
- **Responsive behavior:** Seats use the configured room capacity as the grid count; cards and legal actions stay inside one viewport on desktop and reflow into 44px controls on mobile.

### Rules Guide

- **Surface:** A warm paper card capped at 480px with the strongest modal shadow and a blurred dark backdrop.
- **Content:** Mono eyebrow, compact headline, three-card teaching motif, numbered rules, full-width start action, and the Mtok disclaimer.
- **Focus:** The confirmation action has a visible game-colored focus outline.
- **Game State:** While the guide is open, AI thinking is suspended; closing the guide resumes the same pending turn rather than skipping or batch-resolving it.

Approved AI-sequence evidence is captured at `.impeccable/review/ai-step-1-thinking.png`, `.impeccable/review/ai-step-2-pass.png`, `.impeccable/review/ai-step-3-ready.png`, `.impeccable/review/ai-sequence.webm`, and `.impeccable/review/ai-fix-final.png`. Approved direct-manipulation evidence is captured at `.impeccable/review/drag-select-desktop.png` and `.impeccable/review/drag-select-mobile.png`; browser verification covered exact overlapped-card targeting, forward selection, reverse deselection, cross-row mobile selection, non-primary-button no-ops, and disabled AI-turn input. Reviewer disposition: **PASS / APPROVE**.

## Do's and Don'ts

### Do:

- **Do** preserve one uninterrupted deep-ink field from opponent seats through the hero hand.
- **Do** keep every latest play physically anchored to its actor and keep the current winner visibly larger at center.
- **Do** show rank and suit on every face-up card and a numeric count beside every hidden opponent hand.
- **Do** preserve the 1280 × 800 desktop, 390 × 844 mobile, and centered 980px tall-stage compositions.
- **Do** use the single throw-to-table motion to connect an actor to the new central winner, then render the same final state without animation under reduced motion.
- **Do** render the player's action immediately, then show exactly one AI action after each 900ms thinking beat.
- **Do** preserve the completed action in visible and assistive status while naming the next thinker, including explicit re-lead copy after the second pass.
- **Do** disable hand cards and visible action buttons during AI turns, then restore control on the player's turn.
- **Do** pause pending AI progression whenever the blocking rules guide is open and resume it only after the guide closes.
- **Do** keep amber visible for turn, selection, keyboard focus, hero identity, and multiplier without relying on color alone.
- **Do** keep all 17 player cards face-up throughout bidding while the three kitty cards remain patterned backs.
- **Do** give every mobile Dou Dizhu card an independent grid column at least 44px wide, with the complete hand visible without horizontal overflow or clipping.
- **Do** make the playable hand one captured pointer surface, select the nearest card on pointer-down, and apply an inclusive index range against the selection as it existed when the drag began.
- **Do** preserve native card-button focus, keyboard activation, `aria-pressed`, and visible focus treatment while the container owns pointer hit-testing.
- **Do** clear drag, hover, and selection state whenever game state advances or the round resets.

### Don't:

- **Don't** place seat plays, the winning play, or action history inside trays, panels, cards, or inset modules.
- **Don't** introduce casino ornament, decorative felt textures, chips, rails, or multiple competing table colors.
- **Don't** shrink the central winner to the same scale as seat history or the mobile hand.
- **Don't** flatten the desktop fan into a generic straight row or replace the mobile Dou Dizhu grid with an overlapping row or horizontal scroller.
- **Don't** add a second action rail below the field or let utility chrome compete with the cards.
- **Don't** animate multiple competing events; one causal throw is the motion signature.
- **Don't** remount or replay the previous winning-card throw when an AI passes.
- **Don't** batch consecutive AI decisions into one invisible state jump.
- **Don't** make the bidding hand selectable or let it overlap the bidding controls.
- **Don't** let overlapping or lifted card geometry change pointer targets during an active drag.
- **Don't** show grab, hover, selection hints, or pointer handlers during AI turns, bidding, or terminal states.
