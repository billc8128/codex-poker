"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BlackjackState } from "../../../lib/games/blackjack";
import {
  CardArtwork,
  CardBackArt,
  cardDisplayName,
} from "../../components/playing-card";

type RoomGameId = "doudizhu" | "zhajinhua" | "holdem" | "blackjack";
type Card = { id?: string; rank: string; suit: string };
type Player = {
  id: string;
  name: string;
  seat: number;
  ready: boolean;
  connected: boolean;
  isBot: boolean;
};
type GameSnapshot = {
  type: RoomGameId;
  phase: string;
  currentPlayer: number | null;
  message?: string;
  winner?: number;
  myHand?: Card[];
  handCounts?: number[];
  landlord?: number | null;
  multiplier?: number;
  highestBid?: number;
  bids?: Array<{ player: number; bid: number }>;
  target?: { player: number; cards: Card[] } | null;
  kitty?: Card[];
  round?: number;
  pot?: number;
  stake?: number;
  active?: boolean[];
  seen?: boolean[];
  revealedHands?: Card[][] | null;
  board?: Card[];
  currentBet?: number;
  minRaise?: number;
  dealer?: number;
  smallBlind?: number;
  bigBlind?: number;
  players?: Array<{
    stack: number;
    streetBet: number;
    totalBet?: number;
    folded: boolean;
    allIn: boolean;
  }>;
  actions?: Array<{
    player: number;
    action: "fold" | "check" | "call" | "raise" | "allin";
    amount: number;
    street: string;
  }>;
  winners?: number[];
  myState?: BlackjackState | null;
  playerStates?: Record<
    string,
    { phase: string; result?: string; delta?: number }
  >;
};
type Snapshot = {
  code: string;
  gameType: RoomGameId;
  maxPlayers: number;
  phase: "lobby" | "playing" | "done";
  hostId: string;
  me: { id: string; seat: number } | null;
  players: Player[];
  gameNumber: number;
  version: number;
  turnDeadline: number | null;
  settled: boolean;
  game: GameSnapshot | null;
};

const gameNames: Record<RoomGameId, string> = {
  doudizhu: "斗地主",
  zhajinhua: "扎金花",
  holdem: "德州扑克",
  blackjack: "21 点",
};
const cardName = (card: Card) => cardDisplayName(card);
const holdemStreetNames: Record<string, string> = {
  preflop: "翻牌前",
  flop: "翻牌",
  turn: "转牌",
  river: "河牌",
  done: "摊牌",
};
const holdemActionNames = {
  fold: "弃牌",
  check: "过牌",
  call: "跟注",
  raise: "加注",
  allin: "全下",
} as const;

function holdemPosition(game: GameSnapshot, seat: number) {
  const dealer = game.dealer ?? 0;
  return ["D", "SB", "BB", "UTG", "HJ", "CO"][
    (seat - dealer + 6) % 6
  ];
}

function holdemActionLabel(game: GameSnapshot, seat: number) {
  const player = game.players?.[seat];
  if (!player) return "等待入座";
  if (game.phase === "done" && game.winners?.includes(seat)) return "本局胜者";
  if (player.folded) return "已弃牌";
  if (player.allIn) return `全下 ${player.streetBet}`;
  if (game.currentPlayer === seat) return "行动中";
  const latest = [...(game.actions ?? [])]
    .reverse()
    .find(
      (action) =>
        action.player === seat &&
        (game.phase === "done" || action.street === game.phase),
    );
  if (!latest) return player.streetBet ? `已下 ${player.streetBet}` : "等待行动";
  const amount = latest.amount > 0 ? ` ${latest.amount}` : "";
  return `${holdemActionNames[latest.action]}${amount}`;
}

function RoomCards({
  cards,
  selected = [],
  disabled = true,
  compact = false,
  dragSelect = false,
  hero = false,
  onSelectionChange,
}: {
  cards: Card[];
  selected?: string[];
  disabled?: boolean;
  compact?: boolean;
  dragSelect?: boolean;
  hero?: boolean;
  onSelectionChange?: (ids: string[]) => void;
}) {
  const drag = useRef<{
    pointerId: number;
    start: number;
    last: number;
    selecting: boolean;
    base: Set<string>;
    centers: number[];
  } | null>(null);
  const cardIds = cards.map(
    (card, index) => card.id ?? `${card.rank}-${card.suit}-${index}`,
  );
  const nearestCard = (centers: number[], x: number) => {
    let nearest = -1;
    let distance = Number.POSITIVE_INFINITY;
    centers.forEach((center, index) => {
      const next = Math.abs(center - x);
      if (next < distance) {
        nearest = index;
        distance = next;
      }
    });
    return nearest;
  };
  const updateDragSelection = (end: number) => {
    const current = drag.current;
    if (!current || end < 0 || end === current.last) return;
    current.last = end;
    const first = Math.min(current.start, end);
    const last = Math.max(current.start, end);
    const next = new Set(current.base);
    cardIds.slice(first, last + 1).forEach((id) => {
      if (current.selecting) next.add(id);
      else next.delete(id);
    });
    onSelectionChange?.(cardIds.filter((id) => next.has(id)));
  };
  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragSelect || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    const centers = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("button"),
      (element) => {
        const rect = element.getBoundingClientRect();
        return rect.left + rect.width / 2;
      },
    );
    const index = nearestCard(centers, event.clientX);
    if (index < 0) return;
    drag.current = {
      pointerId: event.pointerId,
      start: index,
      last: -1,
      selecting: !selected.includes(cardIds[index]),
      base: new Set(selected),
      centers,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    updateDragSelection(index);
  };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    updateDragSelection(nearestCard(current.centers, event.clientX));
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };

  return (
    <div
      aria-label={dragSelect ? "你的手牌，可点击或拖动连续选择" : undefined}
      className={`room-card-row ${compact ? "room-card-row-hand" : "room-card-row-table"} ${dragSelect ? "is-drag-selecting" : ""} ${hero ? "room-card-row-hero" : ""}`}
      onPointerCancel={dragSelect ? endDrag : undefined}
      onPointerDown={dragSelect ? beginDrag : undefined}
      onPointerMove={dragSelect ? moveDrag : undefined}
      onPointerUp={dragSelect ? endDrag : undefined}
    >
      {cards.map((card, index) => {
        const id = cardIds[index];
        return (
          <button
            aria-label={cardName(card)}
            aria-pressed={selected.includes(id)}
            className={selected.includes(id) ? "selected" : ""}
            disabled={disabled}
            key={id}
            onClick={() =>
              onSelectionChange?.(
                selected.includes(id)
                  ? selected.filter((value) => value !== id)
                  : [...selected, id],
              )
            }
            style={{ "--room-card-index": index } as React.CSSProperties}
          >
            <CardArtwork rank={card.rank} suit={card.suit} />
          </button>
        );
      })}
    </div>
  );
}

export function MultiplayerRoom({
  code,
  playerName,
}: {
  code: string;
  playerName: string;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState("连接房间中…");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [connection, setConnection] = useState<WebSocket | null>(null);

  useEffect(() => {
    let active = true;
    let currentSocket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    const open = async () => {
      const response = await fetch(`/api/rooms/${code}/token`);
      const body = (await response.json()) as {
        websocketUrl?: string;
        error?: string;
      };
      if (!active) return;
      if (!body.websocketUrl) {
        setError(body.error ?? "无法加入房间");
        return;
      }
      const ws = new WebSocket(body.websocketUrl);
      currentSocket = ws;
      setConnection(ws);
      ws.onopen = () => setStatus("已连接");
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as {
          type: "snapshot" | "error";
          data?: Snapshot;
          message?: string;
        };
        if (message.type === "snapshot" && message.data) {
          setSnapshot(message.data);
          setSelected([]);
          setError("");
        } else if (message.message) setError(message.message);
      };
      ws.onclose = () => {
        if (!active) return;
        setConnection(null);
        setStatus("连接中断，正在重连…");
        reconnectTimer = window.setTimeout(open, 1200);
      };
    };
    void open();
    return () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      currentSocket?.close();
    };
  }, [code]);

  const send = useCallback(
    (message: object) => {
      if (connection?.readyState === WebSocket.OPEN)
        connection.send(JSON.stringify(message));
    },
    [connection],
  );
  const me = snapshot?.me;
  const myPlayer = snapshot?.players.find((player) => player.id === me?.id);
  const isHost = snapshot?.hostId === me?.id;
  const myTurn = Boolean(
    snapshot?.game &&
      me &&
      snapshot.game.currentPlayer === me.seat,
  );
  const playerAt = (seat: number) =>
    snapshot?.players.find((player) => player.seat === seat);
  const turnName =
    snapshot?.game?.currentPlayer === null ||
    snapshot?.game?.currentPlayer === undefined
      ? ""
      : playerAt(snapshot.game.currentPlayer)?.name ??
        `座位 ${snapshot.game.currentPlayer + 1}`;
  const inviteUrl = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/room/${code}`,
    [code],
  );
  const minimum = snapshot?.gameType === "blackjack" ? 1 : 3;
  const startGame = () =>
    send({
      type: "start",
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
    });

  return (
    <main className={`room-shell room-theme-${snapshot?.gameType ?? "doudizhu"}`}>
      <header className="room-nav">
        <a href="/rooms">← 多人房</a>
        <strong>房间 {code}</strong>
        <span>{playerName} · {status}</span>
      </header>
      <section className="room-toolbar">
        <div>
          <h1>{snapshot ? gameNames[snapshot.gameType] : "多人牌桌"}</h1>
          <p>
            {snapshot?.phase === "lobby"
              ? `等待玩家准备 · ${snapshot.players.length}/${snapshot.maxPlayers}`
              : turnName
                ? `轮到 ${turnName}`
                : "各自行动"}
          </p>
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(inviteUrl);
            setStatus("邀请链接已复制");
          }}
        >
          复制邀请链接
        </button>
      </section>
      <section className="room-table">
        <div
          className="room-seats"
          style={{ "--room-seats": snapshot?.maxPlayers ?? 3 } as React.CSSProperties}
        >
          {Array.from({ length: snapshot?.maxPlayers ?? 3 }, (_, seat) => {
            const player = playerAt(seat);
            const holdemPlayer =
              snapshot?.game?.type === "holdem"
                ? snapshot.game.players?.[seat]
                : undefined;
            return (
              <div
                className={`room-seat room-seat-${seat} ${snapshot?.game?.currentPlayer === seat ? "turn" : ""} ${holdemPlayer?.folded ? "is-folded" : ""} ${holdemPlayer?.allIn ? "is-all-in" : ""} ${snapshot?.game?.winners?.includes(seat) ? "is-winner" : ""}`}
                key={seat}
              >
                <b>{player?.name ?? "等待加入"}</b>
                <span>
                  {player
                    ? snapshot?.phase === "lobby"
                      ? `${player.isBot ? "AI" : player.connected ? "在线" : "断线"} · ${player.ready ? "已准备" : "未准备"}`
                      : player.isBot
                        ? "策略 AI"
                        : player.connected
                          ? "在线"
                          : "断线托管"
                    : `座位 ${seat + 1}`}
                </span>
                {snapshot?.game && <SeatGameState snapshot={snapshot} seat={seat} />}
              </div>
            );
          })}
        </div>

        {!snapshot ? (
          <div className="room-lobby-state">
            <strong>···</strong>
            <span>正在连接房间</span>
          </div>
        ) : snapshot.phase === "lobby" ? (
          <div className="room-lobby-state">
            <strong>{snapshot.players.length} / {snapshot.maxPlayers}</strong>
            <span>邀请朋友，或由房主用 AI 补齐空位</span>
          </div>
        ) : (
          <RoomGameTable
            myTurn={myTurn}
            onSelectionChange={setSelected}
            playerAt={playerAt}
            selected={selected}
            send={send}
            snapshot={snapshot}
          />
        )}
      </section>
      <section className="room-controls">
        {snapshot?.phase === "lobby" && myPlayer && (
          <button onClick={() => send({ type: "ready", ready: !myPlayer.ready })}>
            {myPlayer.ready ? "取消准备" : "准备"}
          </button>
        )}
        {snapshot?.phase === "lobby" && isHost && (
          <>
            <button onClick={() => send({ type: "remove-bots" })}>移除 AI</button>
            <button onClick={() => send({ type: "fill-bots" })}>AI 补齐</button>
            <button
              className="primary"
              disabled={
                snapshot.players.length < minimum ||
                snapshot.players.some((player) => !player.ready)
              }
              onClick={startGame}
            >
              开始游戏
            </button>
          </>
        )}
        {snapshot?.phase === "done" && (
          <>
            <strong>{snapshot.settled ? "本局已结算" : "正在结算本局…"}</strong>
            {isHost ? (
              <button
                className="primary"
                disabled={!snapshot.settled}
                onClick={startGame}
              >
                再来一局
              </button>
            ) : (
              <span>等待房主开始下一局</span>
            )}
          </>
        )}
      </section>
      {error && <p className="room-error">{error}</p>}
      <small className="room-footnote">
        AI 和真人遵守同一服务端状态机；断线保留座位，每回合 45 秒自动托管。
      </small>
    </main>
  );
}

function SeatGameState({ snapshot, seat }: { snapshot: Snapshot; seat: number }) {
  const game = snapshot.game;
  if (!game) return null;
  if (game.type === "doudizhu")
    return <strong>{game.landlord === seat ? "地主" : "农民"} · {game.handCounts?.[seat]} 张</strong>;
  if (game.type === "zhajinhua")
    return <strong>{game.active?.[seat] ? "在局" : "弃牌"}</strong>;
  if (game.type === "holdem") {
    const player = game.players?.[seat];
    return (
      <>
        <strong className="room-holdem-stack">
          <span>{holdemPosition(game, seat)}</span>
          {player?.stack ?? 0} Mtok
        </strong>
        <em className="room-seat-action">
          {holdemActionLabel(game, seat)}
          {(player?.streetBet ?? 0) > 0 ? ` · 本街 ${player?.streetBet}` : ""}
        </em>
      </>
    );
  }
  return <strong>{game.playerStates?.[seat]?.phase === "done" ? "已结算" : "进行中"}</strong>;
}

function RoomGameTable({
  snapshot,
  selected,
  myTurn,
  send,
  onSelectionChange,
  playerAt,
}: {
  snapshot: Snapshot;
  selected: string[];
  myTurn: boolean;
  send: (message: object) => void;
  onSelectionChange: (ids: string[]) => void;
  playerAt: (seat: number) => Player | undefined;
}) {
  const game = snapshot.game!;
  const seat = snapshot.me?.seat ?? 0;
  if (game.type === "doudizhu")
    return (
      <>
        <div className="room-game-meta">
          <span>×{game.multiplier}</span>
          <strong>{game.phase === "bidding" ? `当前叫分 ${game.highestBid}` : game.target ? `${playerAt(game.target.player)?.name} 的牌` : "新一墩"}</strong>
        </div>
        <div className="room-winning-cards">
          {game.target?.cards.map((card, index) => (
            <span aria-label={cardName(card)} key={card.id ?? index}>
              <CardArtwork rank={card.rank} suit={card.suit} />
            </span>
          ))}
        </div>
        <RoomCards
          cards={game.myHand ?? []}
          compact
          disabled={!myTurn || game.phase !== "playing"}
          dragSelect={myTurn && game.phase === "playing"}
          onSelectionChange={onSelectionChange}
          selected={selected}
        />
        <div className="room-inline-controls">
          {game.phase === "bidding" && myTurn &&
            [0, 1, 2, 3].map((bid) => (
              <button disabled={bid > 0 && bid <= (game.highestBid ?? 0)} key={bid} onClick={() => send({ type: "bid", bid })}>
                {bid ? `${bid} 分` : "不叫"}
              </button>
            ))}
          {game.phase === "playing" && myTurn && (
            <>
              <button disabled={!game.target} onClick={() => send({ type: "pass" })}>过牌</button>
              <button disabled={!selected.length} onClick={() => send({ type: "play", cardIds: selected })}>出牌</button>
            </>
          )}
        </div>
      </>
    );
  if (game.type === "zhajinhua")
    return (
      <>
        <div className="room-game-meta"><span>第 {game.round} 轮</span><strong>底池 {game.pot} · 闷注 {game.stake}</strong></div>
        <RoomCards cards={game.myHand ?? []} hero />
        {!game.myHand?.length && (
          <div className="room-card-backs" aria-label="三张暗牌">
            <span><CardBackArt /></span>
            <span><CardBackArt /></span>
            <span><CardBackArt /></span>
          </div>
        )}
        <div className="room-inline-controls">
          {myTurn && game.phase !== "done" && (
            <>
              <button disabled={game.seen?.[seat]} onClick={() => send({ type: "zjh", action: "see" })}>看牌</button>
              <button onClick={() => send({ type: "zjh", action: "fold" })}>弃牌</button>
              <button onClick={() => send({ type: "zjh", action: "call" })}>跟注</button>
              {(game.stake ?? 10) < 20 && <button onClick={() => send({ type: "zjh", action: "raise", value: 20 })}>加到 20</button>}
              {(game.stake ?? 10) < 40 && <button onClick={() => send({ type: "zjh", action: "raise", value: 40 })}>加到 40</button>}
              {snapshot.players.filter((player) => player.seat !== seat && game.active?.[player.seat]).map((player) => (
                <button disabled={(game.round ?? 0) < 2} key={player.id} onClick={() => send({ type: "zjh", action: "compare", value: player.seat })}>比 {player.name}</button>
              ))}
            </>
          )}
        </div>
      </>
    );
  if (game.type === "holdem") {
    const player = game.players?.[seat];
    const toCall = Math.max(0, (game.currentBet ?? 0) - (player?.streetBet ?? 0));
    return (
      <>
        <div className="room-holdem-center">
          <header>
            <span>{holdemStreetNames[game.phase] ?? game.phase}</span>
            <strong>{game.pot ?? 0}</strong>
            <small>Mtok 底池</small>
          </header>
          <div className="room-board room-holdem-board">
            {(game.board?.length ?? 0) > 0 ? (
              <RoomCards cards={game.board ?? []} />
            ) : (
              <span className="room-holdem-board-empty">等待翻牌</span>
            )}
          </div>
          <footer>
            当前下注 {game.currentBet ?? 0} · 最小加注 {game.minRaise ?? 0}
          </footer>
        </div>
        <span className="room-holdem-hand-label">你的底牌</span>
        <RoomCards cards={game.myHand ?? []} hero />
        <div className="room-inline-controls">
          {myTurn && game.phase !== "done" && (
            <>
              <button onClick={() => send({ type: "holdem", action: "fold" })}>弃牌</button>
              <button onClick={() => send({ type: "holdem", action: toCall ? "call" : "check" })}>{toCall ? `跟注 ${toCall}` : "过牌"}</button>
              <button onClick={() => send({ type: "holdem", action: "raise", target: (game.currentBet ?? 0) + (game.minRaise ?? 20) })}>加注</button>
              <button onClick={() => send({ type: "holdem", action: "allin" })}>全下</button>
            </>
          )}
        </div>
      </>
    );
  }
  const state = game.myState;
  const hand = state?.hands[state.activeHand];
  return (
    <>
      <div className="room-board"><RoomCards cards={state?.dealer ?? []} /></div>
      <div className="room-game-meta"><span>BLACKJACK</span><strong>{state?.result ?? "庄家停软 17"}</strong></div>
      <RoomCards cards={hand?.cards ?? []} />
      <div className="room-inline-controls">
        {state?.phase === "player" && (
          <>
            <button onClick={() => send({ type: "blackjack", action: "hit" })}>要牌</button>
            <button onClick={() => send({ type: "blackjack", action: "stand" })}>停牌</button>
            <button onClick={() => send({ type: "blackjack", action: "double" })}>加倍</button>
            <button onClick={() => send({ type: "blackjack", action: "split" })}>分牌</button>
          </>
        )}
      </div>
    </>
  );
}
