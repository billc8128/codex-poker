"use client";
/* eslint-disable @next/next/no-html-link-for-pages */
import { useEffect, useRef, useState } from "react";
import {
  Card,
  cardLabel,
  randomGameSeed,
} from "../../../lib/games/cards";
import {
  blackjackValue,
  canSplitBlackjack,
  doubleBlackjack,
  hit,
  newBlackjack,
  splitBlackjack,
  stand,
} from "../../../lib/games/blackjack";
import {
  bidDoudizhu,
  DdzCard,
  legalDoudizhuSelection,
  newDoudizhu,
  passDoudizhu,
  playDoudizhu,
  stepDoudizhuAi,
} from "../../../lib/games/doudizhu";
import {
  actHoldem,
  allInHoldem,
  HOLDEM_AI_PROFILES,
  holdemToCall,
  HoldemSeat,
  legalHoldemActions,
  newHoldem,
  raiseHoldem,
} from "../../../lib/games/holdem";
import {
  callZhajinhua,
  compareZhajinhuaAction,
  foldZjh,
  newZhajinhua,
  raiseZhajinhua,
  rankZhajinhua,
  seeCards,
} from "../../../lib/games/zhajinhua";

type Game = "doudizhu" | "zhajinhua" | "holdem" | "blackjack";
const info = {
  doudizhu: ["斗地主", "FIGHT THE LANDLORD", "#253764"],
  zhajinhua: ["扎金花", "THREE CARD BRAG", "#963d32"],
  holdem: ["德州扑克", "6-MAX NO-LIMIT HOLD’EM", "#275d46"],
  blackjack: ["21点", "BLACKJACK · S17", "#292929"],
} as const;
const guides = {
  doudizhu: {
    title: "三人经典斗地主",
    intro: "54 张牌、叫分定地主，支持顺子、连对、飞机、四带二、炸弹和火箭。",
    steps: [
      "先叫 1–3 分或不叫；最高者成为地主",
      "首出可选任意合法牌型，跟牌必须同型同张数且更大",
      "连续两家过牌后，最后出牌者重新首出；先出完的一方获胜",
    ],
  },
  zhajinhua: {
    title: "三张牌，下注与比牌",
    intro:
      "固定桌规：豹子 > 顺金 > 金花 > 顺子 > 对子 > 散牌，杂色 235 只吃豹子。",
    steps: [
      "可闷牌或看牌；看牌后的下注成本翻倍",
      "第二轮起可支付双倍跟注成本与一名玩家比牌",
      "比牌较小者淘汰，只剩一人时赢得底池",
    ],
  },
  holdem: {
    title: "六人无限注德州",
    intro: "你与 5 名策略不同的 AI 同桌；庄家位后依次为小盲 10、大盲 20。",
    steps: [
      "翻牌前从大盲左侧开始，翻牌后从庄家左侧开始行动",
      "面对下注可跟注、加注、全下或弃牌；全下会形成边池",
      "所有存活玩家完成行动后进入下一街，河牌后比较最佳五张牌",
    ],
  },
  blackjack: {
    title: "6 副牌 · 庄家停软 17",
    intro: "Blackjack 赔付 3:2；支持要牌、停牌、加倍和一次分牌。",
    steps: [
      "A 可算 1 或 11，超过 21 立即爆牌",
      "加倍只补一张；同点数起手牌可分一次",
      "分 A 后每手只补一张；本桌不设保险和投降",
    ],
  },
} as const;

function CardView({
  card,
  hidden = false,
  selected = false,
  onClick,
}: {
  card?: Card;
  hidden?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`playing-card ${hidden ? "hidden" : ""} ${selected ? "selected" : ""}`}
      onClick={onClick}
      disabled={!onClick}
      aria-label={hidden ? "暗牌" : card ? cardLabel(card) : "空牌"}
    >
      {hidden ? (
        <span className="card-back-mark" />
      ) : (
        card && <CardFace rank={card.rank} suit={card.suit} />
      )}
    </button>
  );
}
function CardFace({ rank, suit }: { rank: string; suit: string }) {
  const red = suit === "♥" || suit === "♦";
  return (
    <>
      <span className={`card-corner ${red ? "red" : ""}`}>
        <b>{rank}</b>
        <i>{suit}</i>
      </span>
      <span className={`card-center ${red ? "red" : ""}`}>{suit}</span>
    </>
  );
}
function Hand({ cards, hidden = false }: { cards: Card[]; hidden?: boolean }) {
  return (
    <div className="hand">
      {cards.map((c, i) => (
        <CardView key={`${cardLabel(c)}-${i}`} card={c} hidden={hidden} />
      ))}
    </div>
  );
}
function DdzCardView({
  card,
  selected,
  hovered,
  onClick,
  fanIndex,
  fanCount,
}: {
  card: DdzCard;
  selected?: boolean;
  hovered?: boolean;
  onClick?: () => void;
  fanIndex?: number;
  fanCount?: number;
}) {
  const joker = card.rank === "BJ" || card.rank === "RJ";
  const offset =
    fanIndex === undefined || fanCount === undefined
      ? 0
      : fanIndex - (fanCount - 1) / 2;
  const fanStyle =
    fanIndex === undefined
      ? undefined
      : ({
          "--fan-left": `${50 + offset * 4.35}%`,
          "--fan-rotate": `${offset * 1.15}deg`,
          "--fan-drop": `${Math.abs(offset) * 0.55}px`,
          "--fan-z": fanIndex + 1,
        } as React.CSSProperties);
  return (
    <button
      className={`playing-card ddz-card ${fanIndex !== undefined ? "fan-card" : ""} ${selected ? "selected" : ""} ${hovered ? "pointer-hover" : ""} ${joker ? "joker" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${card.rank}${joker ? "王" : card.suit}`}
      disabled={!onClick}
      style={fanStyle}
    >
      {joker ? (
        <>
          <span className="joker-name">
            {card.rank === "BJ" ? "小王" : "大王"}
          </span>
          <span className="joker-star">★</span>
        </>
      ) : (
        <CardFace rank={card.rank} suit={card.suit} />
      )}
    </button>
  );
}
function DdzPlayedCard({ card }: { card: DdzCard }) {
  const joker = card.rank === "BJ" || card.rank === "RJ";
  return (
    <span className={`played-card ${joker ? "joker" : ""}`}>
      {joker ? (
        <b>{card.rank === "BJ" ? "小王" : "大王"}</b>
      ) : (
        <CardFace rank={card.rank} suit={card.suit} />
      )}
    </span>
  );
}
function OpponentStack({ count }: { count: number }) {
  return (
    <div className="opponent-stack" aria-label={`${count} 张暗牌`}>
      <div className="stack-backs">
        <span />
        <span />
        <span />
        <span />
      </div>
      <strong>{count}</strong>
      <small>张</small>
    </div>
  );
}

const comboNames: Record<string, string> = {
  single: "单张",
  pair: "对子",
  triple: "三张",
  "triple-single": "三带一",
  "triple-pair": "三带一对",
  straight: "顺子",
  "pair-straight": "连对",
  airplane: "飞机",
  "airplane-singles": "飞机带单",
  "airplane-pairs": "飞机带对",
  bomb: "炸弹",
  rocket: "火箭",
  "four-singles": "四带二",
  "four-pairs": "四带两对",
};

export function GameTable({
  game,
  playerName,
  initialSeed,
  initialRoundId,
}: {
  game: Game;
  playerName: string;
  initialSeed: number;
  initialRoundId: string;
}) {
  const [round, setRound] = useState(0),
    [roundId, setRoundId] = useState(initialRoundId),
    [balance, setBalance] = useState(10000),
    [settlementBalance, setSettlementBalance] = useState<number | null>(null),
    [showGuide, setShowGuide] = useState(true),
    [selected, setSelected] = useState<string[]>([]),
    [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [bj, setBj] = useState(() => newBlackjack(initialSeed)),
    [zjh, setZjh] = useState(() => newZhajinhua(initialSeed)),
    [holdem, setHoldem] = useState(() => newHoldem(initialSeed)),
    [ddz, setDdz] = useState(() => newDoudizhu(initialSeed));
  const aiThinking =
    game === "doudizhu" &&
    ddz.phase === "playing" &&
    ddz.currentPlayer !== 0 &&
    !showGuide
      ? ddz.currentPlayer
      : null;
  const canSelectCards = ddz.phase === "playing" && ddz.currentPlayer === 0;
  const saved = useRef<string>();
  const hoverCenters = useRef<{ x: number; y: number }[] | null>(null);
  const dragSelection = useRef<{
    pointerId: number;
    start: number;
    last: number;
    selecting: boolean;
    base: Set<string>;
    centers: { x: number; y: number }[];
  } | null>(null);
  useEffect(() => {
    fetch("/api/results")
      .then((r) => r.json())
      .then((r) => setBalance(r.balance))
      .catch(() => undefined);
  }, []);
  const done =
    game === "blackjack"
      ? bj.phase === "done"
      : game === "zhajinhua"
        ? zjh.phase === "done"
        : game === "holdem"
          ? holdem.street === "done"
          : ddz.phase === "done";
  const state =
      game === "blackjack"
        ? bj
        : game === "zhajinhua"
          ? zjh
          : game === "holdem"
            ? holdem
            : ddz,
    delta = "delta" in state ? state.delta : undefined,
    result =
      "result" in state
        ? state.result
        : "message" in state
          ? state.message
          : undefined;
  const settlementTitle =
      game === "blackjack" && delta !== undefined
        ? delta > 0
          ? "你赢得本局"
          : delta < 0
            ? "庄家赢得本局"
            : "本局和局"
        : result,
    deltaLabel =
      delta === undefined
        ? "—"
        : `${delta > 0 ? "+" : ""}${delta.toLocaleString()}`;
  useEffect(() => {
    if (!done || delta === undefined) return;
    const key = roundId;
    if (saved.current === key) return;
    saved.current = key;
    setSettlementBalance(null);
    fetch("/api/results", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ game, delta, roundId }),
    })
      .then((r) => r.json())
      .then((r) => {
        setBalance(r.balance);
        setSettlementBalance(r.balance);
      })
      .catch(() =>
        setBalance((current) => {
          const next = current + delta;
          setSettlementBalance(next);
          return next;
        }),
      );
  }, [done, delta, game, roundId]);
  useEffect(() => {
    if (aiThinking === null) return;
    const timer = window.setTimeout(() => {
      setDdz((current) => stepDoudizhuAi(current));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [aiThinking, ddz.actions.length]);
  const reset = () => {
    const s = randomGameSeed();
    setRound((r) => r + 1);
    setSelected([]);
    setHoveredCardId(null);
    dragSelection.current = null;
    hoverCenters.current = null;
    saved.current = undefined;
    setSettlementBalance(null);
    setRoundId(crypto.randomUUID());
    if (game === "blackjack") setBj(newBlackjack(s));
    if (game === "zhajinhua") setZjh(newZhajinhua(s));
    if (game === "holdem")
      setHoldem(newHoldem(s, ((holdem.dealer + 1) % 6) as HoldemSeat));
    if (game === "doudizhu") setDdz(newDoudizhu(s));
  };
  const meta = info[game],
    ddzSelection = legalDoudizhuSelection(ddz, selected),
    holdemActions = legalHoldemActions(holdem),
    toCall = holdemToCall(holdem);
  const ddzPlayerName = (player: number) =>
    player === 0 ? "你" : `AI ${player}`;
  const latestDdzAction = (player: number) =>
    [...ddz.actions].reverse().find((action) => action.player === player);
  const holdemPosition = (player: HoldemSeat) =>
    player === holdem.dealer
      ? "D"
      : player === holdem.smallBlind
        ? "SB"
        : player === holdem.bigBlind
          ? "BB"
          : "";
  const latestHoldemAction = (player: HoldemSeat) =>
    [...holdem.actions].reverse().find((action) => action.player === player);
  const holdemActionLabel = (player: HoldemSeat) => {
    const action = latestHoldemAction(player);
    if (!action) return null;
    if (action.action === "fold") return "弃牌";
    if (action.action === "check") return "过牌";
    if (action.action === "call") return `跟注 ${action.amount}`;
    if (action.action === "raise") return `加注到 ${action.amount}`;
    return `全下 ${action.amount}`;
  };
  const lastDdzAction = ddz.actions.at(-1);
  const updateDdz = (next: typeof ddz) => {
    dragSelection.current = null;
    hoverCenters.current = null;
    setHoveredCardId(null);
    setDdz(next);
    setSelected([]);
  };
  const toggleCard = (id: string) =>
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  const getCardCenters = (container: HTMLDivElement) =>
    Array.from(container.querySelectorAll<HTMLElement>(".fan-card")).map(
      (element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      },
    );
  const nearestCardIndex = (
    centers: { x: number; y: number }[],
    x: number,
    y: number,
  ) => {
    let nearest = -1;
    let distance = Number.POSITIVE_INFINITY;
    centers.forEach((center, index) => {
      const next = (center.x - x) ** 2 + (center.y - y) ** 2;
      if (next < distance) {
        distance = next;
        nearest = index;
      }
    });
    return nearest;
  };
  const applyDragSelection = (end: number) => {
    const drag = dragSelection.current;
    if (!drag || end < 0 || end === drag.last) return;
    drag.last = end;
    const start = Math.min(drag.start, end);
    const finish = Math.max(drag.start, end);
    const next = new Set(drag.base);
    ddz.hands[0].slice(start, finish + 1).forEach((card) => {
      if (drag.selecting) next.add(card.id);
      else next.delete(card.id);
    });
    setSelected(
      ddz.hands[0].filter((card) => next.has(card.id)).map((card) => card.id),
    );
  };
  const beginCardDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSelectCards || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    const centers = getCardCenters(event.currentTarget);
    hoverCenters.current = centers;
    const index = nearestCardIndex(centers, event.clientX, event.clientY);
    if (index < 0) return;
    const id = ddz.hands[0][index].id;
    dragSelection.current = {
      pointerId: event.pointerId,
      start: index,
      last: -1,
      selecting: !selected.includes(id),
      base: new Set(selected),
      centers,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHoveredCardId(id);
    applyDragSelection(index);
  };
  const moveCardDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSelectCards) return;
    const drag = dragSelection.current;
    const centers =
      drag?.centers ??
      hoverCenters.current ??
      getCardCenters(event.currentTarget);
    hoverCenters.current = centers;
    const index = nearestCardIndex(centers, event.clientX, event.clientY);
    if (index >= 0) setHoveredCardId(ddz.hands[0][index]?.id ?? null);
    if (drag && drag.pointerId === event.pointerId) applyDragSelection(index);
  };
  const endCardDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragSelection.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragSelection.current = null;
  };
  const liveMessage =
    game === "doudizhu" && aiThinking !== null
      ? `${ddz.message} AI ${aiThinking} 正在思考。`
      : game === "doudizhu" &&
          ddz.phase === "playing" &&
          ddz.bids.length > 0 &&
          ddz.actions.length <= 2
        ? `${ddz.landlord === 0 ? "你" : `AI ${ddz.landlord}`}成为地主，牌局开始。${ddz.message}`
        : done
          ? `${settlementTitle}。本局 ${deltaLabel} Mtok。`
          : "message" in state
            ? state.message
            : "轮到你行动";
  return (
    <main
      className={`table-shell theme-${game} ${game === "doudizhu" ? `phase-${ddz.phase}` : ""}`}
      style={{ "--game": meta[2] } as React.CSSProperties}
    >
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage}
      </span>
      <header className="table-nav">
        <a href="/">← 大厅</a>
        <div>
          <span className="live-dot" /> {meta[0]} · 单人
        </div>
        <div>
          {balance.toLocaleString()} <small>Mtok</small>
        </div>
      </header>
      {game !== "doudizhu" && (
        <section className="table-head">
          <div>
            <h1>{meta[0]}</h1>
          </div>
          <div className="round-meta">
            <span>玩家</span>
            <strong>{playerName}</strong>
          </div>
        </section>
      )}
      <section className="felt">
        {game === "blackjack" && (
          <>
            <div className="seat opponent">
              <span className="seat-label">
                庄家 · {bj.phase === "done" ? blackjackValue(bj.dealer) : "?"}
              </span>
              <div className="hand">
                {bj.dealer.map((c, i) => (
                  <CardView
                    key={`${cardLabel(c)}${i}`}
                    card={c}
                    hidden={bj.phase !== "done" && i === 1}
                  />
                ))}
              </div>
            </div>
            <div className="table-center">
              <strong>BLACKJACK 3:2</strong>
              <span>庄家停在软 17 · 不设保险/投降</span>
            </div>
            <div className="bj-hands">
              {bj.hands.map((hand, i) => (
                <div
                  className={`seat player bj-hand ${bj.phase === "player" && bj.activeHand === i ? "active" : ""}`}
                  key={i}
                >
                  <span className="seat-label">
                    第 {i + 1} 手 · {blackjackValue(hand.cards)} · 下注{" "}
                    {hand.bet}
                  </span>
                  <Hand cards={hand.cards} />
                </div>
              ))}
            </div>
          </>
        )}
        {game === "zhajinhua" && (
          <>
            <div className="opponent-row">
              {[1, 2].map((p) => (
                <div
                  className={`seat ${!zjh.active[p] ? "eliminated" : ""}`}
                  key={p}
                >
                  <span className="seat-label">
                    AI {p} · {zjh.active[p] ? "在局" : "淘汰"}
                  </span>
                  <Hand cards={zjh.hands[p]} hidden={zjh.phase !== "done"} />
                </div>
              ))}
            </div>
            <div className="pot">
              底池 <strong>{zjh.pot}</strong> Mtok · 闷注 {zjh.stake}
            </div>
            <div className="seat player">
              <span className="seat-label">
                你 ·{" "}
                {zjh.seen[0] ? rankZhajinhua(zjh.hands[0]).category : "未看牌"}
              </span>
              <Hand cards={zjh.hands[0]} hidden={!zjh.seen[0]} />
            </div>
          </>
        )}
        {game === "holdem" && (
          <div className="holdem-ring">
            {([1, 2, 3, 4, 5] as HoldemSeat[]).map((player) => {
              const seat = holdem.players[player],
                position = holdemPosition(player),
                action = holdemActionLabel(player);
              return (
                <section
                  className={`holdem-seat holdem-seat-${player} ${holdem.actor === player ? "is-turn" : ""} ${seat.folded ? "is-folded" : ""}`}
                  key={player}
                >
                  <div className="holdem-seat-copy">
                    <strong>AI {player}</strong>
                    <span>
                      {HOLDEM_AI_PROFILES[player].name}
                      {position ? ` · ${position}` : ""}
                    </span>
                  </div>
                  <Hand
                    cards={holdem.hands[player]}
                    hidden={holdem.street !== "done" || seat.folded}
                  />
                  <div className="holdem-stack">
                    {seat.stack} <small>Mtok</small>
                  </div>
                  {action && <em>{action}</em>}
                </section>
              );
            })}
            <div className="holdem-board">
              <Hand cards={holdem.board} />
              {holdem.board.length === 0 && <span>等待翻牌</span>}
            </div>
            <div className="holdem-pot">
              <span>{holdem.street}</span>
              底池 <strong>{holdem.pot}</strong> Mtok
            </div>
            <section
              className={`holdem-seat holdem-hero ${holdem.actor === 0 ? "is-turn" : ""} ${holdem.players[0].folded ? "is-folded" : ""}`}
            >
              <div className="holdem-seat-copy">
                <strong>你</strong>
                <span>
                  {playerName}
                  {holdemPosition(0) ? ` · ${holdemPosition(0)}` : ""}
                </span>
              </div>
              <Hand cards={holdem.hands[0]} />
              <div className="holdem-stack">
                {holdem.players[0].stack} <small>Mtok</small>
              </div>
              {holdemActionLabel(0) && <em>{holdemActionLabel(0)}</em>}
            </section>
          </div>
        )}
        {game === "doudizhu" && (
          <>
            {ddz.phase === "bidding" ? (
              <>
                <div className="bidding-stage">
                  <span className="bid-turn">轮到你竞叫</span>
                  <p>3 张底牌</p>
                  <div className="hand">
                    {ddz.kitty.map((c) => (
                      <button
                        className="playing-card hidden"
                        disabled
                        key={c.id}
                      >
                        ◆
                      </button>
                    ))}
                  </div>
                  <strong>
                    {ddz.highestBidder === null
                      ? "还没有人叫分"
                      : `AI ${ddz.highestBidder} 当前最高：${ddz.highestBid} 分`}
                  </strong>
                  <div className="bid-history" aria-label="竞叫记录">
                    {ddz.bids.map((item, index) => (
                      <span key={`${item.player}-${index}`}>
                        <b>{ddzPlayerName(item.player)}</b>
                        {item.bid === 0 ? "不叫" : `叫 ${item.bid} 分`}
                      </span>
                    ))}
                  </div>
                  <span className="bid-guidance">{ddz.message}</span>
                </div>
                <span className="bidding-hand-label">
                  你的 17 张手牌 · 看牌后决定是否叫分
                </span>
                <div
                  className="fan-hand bidding-fan"
                  aria-label="你的 17 张手牌"
                >
                  {ddz.hands[0].map((card, index) => (
                    <DdzCardView
                      card={card}
                      fanIndex={index}
                      fanCount={ddz.hands[0].length}
                      key={card.id}
                    />
                  ))}
                </div>
                <span className="fan-scroll-cue bidding-scroll-cue">
                  左右滑动查看全部手牌
                </span>
              </>
            ) : (
              <div className="ddz-stage">
                <div className="table-inscription">
                  <span>第 {round + 1} 局</span>
                  <strong>×{ddz.multiplier}</strong>
                </div>
                {aiThinking !== null && (
                  <div className="ai-thinking-badge">
                    {lastDdzAction?.kind === "pass" &&
                    lastDdzAction.player !== aiThinking
                      ? `AI ${lastDdzAction.player} 过牌 · AI ${aiThinking} 思考中…`
                      : `AI ${aiThinking} 正在思考…`}
                  </div>
                )}

                {[1, 2].map((player) => {
                  const action = latestDdzAction(player);
                  return (
                    <section
                      className={`floating-seat seat-${player} ${ddz.currentPlayer === player ? "is-turn" : ""}`}
                      key={player}
                    >
                      <div className="floating-seat-name">
                        <span className="player-token">AI {player}</span>
                        <p>
                          <strong>
                            {ddz.landlord === player ? "地主" : "农民"}
                          </strong>
                        </p>
                      </div>
                      <OpponentStack count={ddz.hands[player].length} />
                      <div className={`seat-thrown-cards from-${player}`}>
                        {action?.kind === "play" ? (
                          action.cards.map((card) => (
                            <DdzPlayedCard card={card} key={card.id} />
                          ))
                        ) : action?.kind === "pass" ? (
                          <span className="pass-word">过牌</span>
                        ) : null}
                      </div>
                    </section>
                  );
                })}

                <section className="table-winning-play" aria-label="当前最大牌">
                  {ddz.target ? (
                    <>
                      <span className="winning-player">
                        {ddzPlayerName(ddz.target.player)} ·{" "}
                        {ddz.landlord === ddz.target.player ? "地主" : "农民"}
                      </span>
                      <div
                        className={`winning-cards thrown-from-${ddz.target.player}`}
                        key={`${ddz.target.player}-${ddz.target.cards.map((card) => card.id).join("-")}`}
                      >
                        {ddz.target.cards.map((card) => (
                          <DdzPlayedCard card={card} key={card.id} />
                        ))}
                      </div>
                      <strong>
                        {comboNames[ddz.target.combo.type]}
                        <small className="winning-multiplier">
                          ×{ddz.multiplier}
                        </small>
                      </strong>
                    </>
                  ) : (
                    <div className="open-table">
                      <strong>新一墩</strong>
                      <span>{ddzPlayerName(ddz.currentPlayer)}先出牌</span>
                    </div>
                  )}
                </section>

                <section className="hero-floating-seat">
                  <div className="hero-identity">
                    <span className="player-token hero">你</span>
                    <p>
                      <strong>{playerName}</strong>
                      <small>
                        {ddz.landlord === 0 ? "地主" : "农民"} ·{" "}
                        {ddz.hands[0].length} 张
                      </small>
                      {canSelectCards && (
                        <em className="select-gesture-hint">点击或拖动选牌</em>
                      )}
                    </p>
                  </div>
                  {latestDdzAction(0)?.kind === "play" && (
                    <div className="hero-last-play">
                      {latestDdzAction(0)!.cards.map((card) => (
                        <DdzPlayedCard card={card} key={card.id} />
                      ))}
                    </div>
                  )}
                </section>

                <div
                  className={`fan-hand ${canSelectCards ? "drag-select-hand" : ""}`}
                  aria-label="你的手牌，可点击或拖动连续选择"
                  onPointerEnter={
                    canSelectCards
                      ? (event) => {
                          hoverCenters.current = getCardCenters(
                            event.currentTarget,
                          );
                        }
                      : undefined
                  }
                  onPointerDown={canSelectCards ? beginCardDrag : undefined}
                  onPointerMove={canSelectCards ? moveCardDrag : undefined}
                  onPointerUp={canSelectCards ? endCardDrag : undefined}
                  onPointerCancel={canSelectCards ? endCardDrag : undefined}
                  onPointerLeave={
                    canSelectCards
                      ? () => {
                          if (!dragSelection.current) {
                            hoverCenters.current = null;
                            setHoveredCardId(null);
                          }
                        }
                      : undefined
                  }
                >
                  {ddz.hands[0].map((card, index) => (
                    <DdzCardView
                      card={card}
                      selected={selected.includes(card.id)}
                      hovered={canSelectCards && hoveredCardId === card.id}
                      onClick={
                        canSelectCards ? () => toggleCard(card.id) : undefined
                      }
                      fanIndex={index}
                      fanCount={ddz.hands[0].length}
                      key={card.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
      <section className={`action-rail ${done ? "is-settlement" : ""}`}>
        <div className={done ? "settlement-copy" : undefined}>
          <span>{done ? "本局结算" : "状态"}</span>
          <strong>
            {done
              ? settlementTitle
              : "message" in state
                ? state.message
                : "轮到你行动"}
          </strong>
          {done && game === "blackjack" && result !== settlementTitle && (
            <small>{result}</small>
          )}
        </div>
        {done && delta !== undefined && (
          <div
            className="settlement-score"
            aria-label={`本局 ${deltaLabel} Mtok`}
          >
            <div>
              <strong
                className={
                  delta > 0 ? "positive" : delta < 0 ? "negative" : ""
                }
              >
                {deltaLabel}
              </strong>
              <span>Mtok</span>
            </div>
            <small>
              {settlementBalance === null
                ? "余额结算中…"
                : `余额 ${settlementBalance.toLocaleString()} Mtok`}
            </small>
          </div>
        )}
        <div className="actions">
          {!done && game === "blackjack" && bj.phase === "player" && (
            <>
              <button onClick={() => setBj(hit(bj))}>要牌</button>
              <button onClick={() => setBj(stand(bj))}>停牌</button>
              <button
                disabled={bj.hands[bj.activeHand].cards.length !== 2}
                onClick={() => setBj(doubleBlackjack(bj))}
              >
                加倍
              </button>
              <button
                disabled={!canSplitBlackjack(bj)}
                onClick={() => setBj(splitBlackjack(bj))}
              >
                分牌
              </button>
            </>
          )}
          {!done && game === "zhajinhua" && (
            <>
              <button
                disabled={zjh.seen[0]}
                onClick={() => setZjh(seeCards(zjh))}
              >
                看牌
              </button>
              <button onClick={() => setZjh(foldZjh(zjh))}>弃牌</button>
              <button
                className="primary"
                onClick={() => setZjh(callZhajinhua(zjh))}
              >
                跟注
              </button>
              {zjh.stake < 20 && (
                <button onClick={() => setZjh(raiseZhajinhua(zjh, 20))}>
                  加到 20
                </button>
              )}
              {zjh.stake < 40 && (
                <button onClick={() => setZjh(raiseZhajinhua(zjh, 40))}>
                  加到 40
                </button>
              )}
              <button
                disabled={zjh.round < 2 || !zjh.active[1]}
                onClick={() => setZjh(compareZhajinhuaAction(zjh, 1))}
              >
                比 AI 1
              </button>
              <button
                disabled={zjh.round < 2 || !zjh.active[2]}
                onClick={() => setZjh(compareZhajinhuaAction(zjh, 2))}
              >
                比 AI 2
              </button>
            </>
          )}
          {!done && game === "holdem" && (
            <>
              {holdemActions.includes("fold") && (
                <button onClick={() => setHoldem(actHoldem(holdem, "fold"))}>
                  弃牌
                </button>
              )}
              {holdemActions.includes("check") && (
                <button
                  className="primary"
                  onClick={() => setHoldem(actHoldem(holdem, "check"))}
                >
                  过牌
                </button>
              )}
              {holdemActions.includes("call") && (
                <button
                  className="primary"
                  onClick={() => setHoldem(actHoldem(holdem, "call"))}
                >
                  跟注 {toCall}
                </button>
              )}
              {holdemActions.includes("raise") && (
                <button onClick={() => setHoldem(raiseHoldem(holdem))}>
                  加注到 {holdem.currentBet + holdem.minRaise}
                </button>
              )}
              {holdemActions.includes("allin") && (
                <button onClick={() => setHoldem(allInHoldem(holdem))}>
                  全下 {holdem.players[0].stack}
                </button>
              )}
            </>
          )}
          {!done && game === "doudizhu" && ddz.phase === "bidding" && (
            <>
              {[0, 1, 2, 3].map((bid) => (
                <button
                  disabled={bid > 0 && bid <= ddz.highestBid}
                  className={bid === 3 ? "primary" : ""}
                  onClick={() => updateDdz(bidDoudizhu(ddz, bid))}
                  key={bid}
                >
                  {bid === 0
                    ? ddz.highestBidder === null
                      ? "我不叫"
                      : "放弃竞叫"
                    : `叫 ${bid} 分`}
                </button>
              ))}
            </>
          )}
          {!done &&
            game === "doudizhu" &&
            ddz.phase === "playing" &&
            ddz.currentPlayer === 0 && (
              <>
                {selected.length > 0 && (
                  <span
                    className={`selection-status ${ddzSelection.legal ? "legal" : ""}`}
                  >
                    {ddzSelection.combo
                      ? `${comboNames[ddzSelection.combo.type]}${ddzSelection.legal ? " · 可出" : " · 压不住"}`
                      : "未组成合法牌型"}
                  </span>
                )}
                <button
                  disabled={!ddz.target}
                  onClick={() => updateDdz(passDoudizhu(ddz, false))}
                >
                  过牌
                </button>
                <button
                  className="primary"
                  disabled={!ddzSelection.legal}
                  onClick={() => updateDdz(playDoudizhu(ddz, selected, false))}
                >
                  出牌
                </button>
              </>
            )}
          {!done &&
            game === "doudizhu" &&
            ddz.phase === "playing" &&
            ddz.currentPlayer !== 0 && (
              <>
                <span className="ai-action-wait">
                  AI {ddz.currentPlayer} 思考中…
                </span>
                <button disabled>过牌</button>
                <button className="primary" disabled>
                  出牌
                </button>
              </>
            )}
          {done && (
            <button className="primary" onClick={reset}>
              再来一局
            </button>
          )}
        </div>
      </section>
      <button className="help-button" onClick={() => setShowGuide(true)}>
        完整桌规
      </button>
      {showGuide && (
        <div
          className="guide-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
        >
          <section className="guide-card">
            <p>{meta[1]} · TABLE RULES</p>
            <h2 id="guide-title">{guides[game].title}</h2>
            <div className="guide-demo" aria-hidden="true">
              <span>3</span>
              <span>7</span>
              <span>Q</span>
            </div>
            <p className="guide-intro">{guides[game].intro}</p>
            <ol>
              {guides[game].steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button onClick={() => setShowGuide(false)}>
              读完了，开始 <span>→</span>
            </button>
            <small>Mtok 仅为虚拟积分，不可充值、提现或兑换现金</small>
          </section>
        </div>
      )}
    </main>
  );
}
