import { deck } from "./cards";

export type DdzRank =
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A"
  | "2"
  | "BJ"
  | "RJ";
export type DdzCard = { id: string; rank: DdzRank; suit: string };
export type DdzComboType =
  | "single"
  | "pair"
  | "triple"
  | "triple-single"
  | "triple-pair"
  | "straight"
  | "pair-straight"
  | "airplane"
  | "airplane-singles"
  | "airplane-pairs"
  | "bomb"
  | "rocket"
  | "four-singles"
  | "four-pairs";
export type DdzCombo = {
  type: DdzComboType;
  main: number;
  length: number;
  sequence: number;
};
export type DdzPlay = { player: number; cards: DdzCard[]; combo: DdzCombo };
export type DdzAction = {
  player: number;
  kind: "play" | "pass";
  cards: DdzCard[];
  combo?: DdzCombo;
};
export type DdzBid = { player: number; bid: number };
export type DdzState = {
  phase: "bidding" | "playing" | "done";
  seed: number;
  firstBidder: 0 | 1 | 2;
  hands: [DdzCard[], DdzCard[], DdzCard[]];
  kitty: DdzCard[];
  currentPlayer: 0 | 1 | 2;
  bids: DdzBid[];
  highestBid: number;
  highestBidder: number | null;
  consecutivePasses: number;
  landlord: number | null;
  target: DdzPlay | null;
  lastPlayer: number | null;
  multiplier: number;
  actions: DdzAction[];
  message: string;
  winner?: number;
  delta?: number;
};

const RANKS: DdzRank[] = [
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
  "2",
  "BJ",
  "RJ",
];
const COMBO_NAMES: Record<DdzComboType, string> = {
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
export const doudizhuValue = (card: DdzCard) => RANKS.indexOf(card.rank);
const value = (rank: DdzRank) => RANKS.indexOf(rank);
const sortCards = (cards: DdzCard[]) =>
  [...cards].sort(
    (a, b) => value(a.rank) - value(b.rank) || a.id.localeCompare(b.id),
  );
const groups = (cards: DdzCard[]) => {
  const out = new Map<DdzRank, DdzCard[]>();
  for (const card of sortCards(cards))
    out.set(card.rank, [...(out.get(card.rank) || []), card]);
  return out;
};
const isSequence = (values: number[]) =>
  values.length > 0 &&
  values.every((v, i) => i === 0 || v === values[i - 1] + 1) &&
  values.at(-1)! <= value("A");

export function classifyDoudizhu(cards: DdzCard[]): DdzCombo | null {
  const n = cards.length;
  if (!n) return null;
  const g = groups(cards),
    entries = [...g.entries()]
      .map(([rank, list]) => ({ rank, count: list.length, v: value(rank) }))
      .sort((a, b) => a.v - b.v);
  const counts = entries.map((x) => x.count),
    values = entries.map((x) => x.v);
  if (n === 2 && g.has("BJ") && g.has("RJ"))
    return { type: "rocket", main: value("RJ"), length: 2, sequence: 1 };
  if (n === 4 && entries.length === 1)
    return { type: "bomb", main: values[0], length: 4, sequence: 1 };
  if (n === 1)
    return { type: "single", main: values[0], length: 1, sequence: 1 };
  if (n === 2 && counts[0] === 2)
    return { type: "pair", main: values[0], length: 2, sequence: 1 };
  if (n === 3 && counts[0] === 3)
    return { type: "triple", main: values[0], length: 3, sequence: 1 };
  if (n === 4 && counts.includes(3))
    return {
      type: "triple-single",
      main: entries.find((x) => x.count === 3)!.v,
      length: 4,
      sequence: 1,
    };
  if (n === 5 && counts.includes(3) && counts.includes(2))
    return {
      type: "triple-pair",
      main: entries.find((x) => x.count === 3)!.v,
      length: 5,
      sequence: 1,
    };
  if (n >= 5 && counts.every((c) => c === 1) && isSequence(values))
    return { type: "straight", main: values.at(-1)!, length: n, sequence: n };
  if (
    n >= 6 &&
    n % 2 === 0 &&
    counts.every((c) => c === 2) &&
    isSequence(values)
  )
    return {
      type: "pair-straight",
      main: values.at(-1)!,
      length: n,
      sequence: n / 2,
    };
  if (
    n >= 6 &&
    n % 3 === 0 &&
    counts.every((c) => c === 3) &&
    isSequence(values)
  )
    return {
      type: "airplane",
      main: values.at(-1)!,
      length: n,
      sequence: n / 3,
    };
  if (n >= 8 && n % 4 === 0) {
    const k = n / 4,
      trips = entries.filter((x) => x.count === 3);
    const rest = entries.filter((x) => x.count !== 3);
    if (
      trips.length === k &&
      rest.length === k &&
      rest.every((x) => x.count === 1) &&
      isSequence(trips.map((x) => x.v))
    )
      return {
        type: "airplane-singles",
        main: trips.at(-1)!.v,
        length: n,
        sequence: k,
      };
  }
  if (n >= 10 && n % 5 === 0) {
    const k = n / 5,
      trips = entries.filter((x) => x.count === 3);
    const rest = entries.filter((x) => x.count !== 3);
    if (
      trips.length === k &&
      rest.length === k &&
      rest.every((x) => x.count === 2) &&
      isSequence(trips.map((x) => x.v))
    )
      return {
        type: "airplane-pairs",
        main: trips.at(-1)!.v,
        length: n,
        sequence: k,
      };
  }
  if (
    n === 6 &&
    counts.includes(4) &&
    entries.filter((x) => x.count === 1).length === 2
  )
    return {
      type: "four-singles",
      main: entries.find((x) => x.count === 4)!.v,
      length: 6,
      sequence: 1,
    };
  if (
    n === 8 &&
    counts.includes(4) &&
    entries.filter((x) => x.count === 2).length === 2
  )
    return {
      type: "four-pairs",
      main: entries.find((x) => x.count === 4)!.v,
      length: 8,
      sequence: 1,
    };
  return null;
}

export function canBeatDoudizhu(candidate: DdzCombo, target: DdzCombo | null) {
  if (!target) return true;
  if (candidate.type === "rocket") return target.type !== "rocket";
  if (target.type === "rocket") return false;
  if (candidate.type === "bomb")
    return target.type !== "bomb" || candidate.main > target.main;
  if (target.type === "bomb") return false;
  return (
    candidate.type === target.type &&
    candidate.length === target.length &&
    candidate.sequence === target.sequence &&
    candidate.main > target.main
  );
}

function choose<T>(items: T[], count: number): T[][] {
  if (count === 0) return [[]];
  if (items.length < count) return [];
  const out: T[][] = [];
  for (let i = 0; i <= items.length - count; i++)
    for (const tail of choose(items.slice(i + 1), count - 1))
      out.push([items[i], ...tail]);
  return out;
}
function windows(values: number[], min: number) {
  const out: number[][] = [];
  for (let i = 0; i < values.length; i++)
    for (let len = min; i + len <= values.length; len++) {
      const slice = values.slice(i, i + len);
      if (isSequence(slice)) out.push(slice);
      else break;
    }
  return out;
}
export function generateDoudizhuPlays(hand: DdzCard[]): DdzCard[][] {
  const g = groups(hand),
    entries = [...g.entries()]
      .map(([rank, cards]) => ({ rank, v: value(rank), cards }))
      .sort((a, b) => a.v - b.v),
    out: DdzCard[][] = [];
  for (const e of entries) {
    out.push([e.cards[0]]);
    if (e.cards.length >= 2) out.push(e.cards.slice(0, 2));
    if (e.cards.length >= 3) out.push(e.cards.slice(0, 3));
    if (e.cards.length === 4) out.push(e.cards.slice(0, 4));
  }
  if (g.has("BJ") && g.has("RJ")) out.push([g.get("BJ")![0], g.get("RJ")![0]]);
  for (const core of entries.filter((e) => e.cards.length >= 3)) {
    const others = entries.filter((e) => e.rank !== core.rank);
    for (const kicker of others)
      out.push([...core.cards.slice(0, 3), kicker.cards[0]]);
    for (const kicker of others.filter((e) => e.cards.length >= 2))
      out.push([...core.cards.slice(0, 3), ...kicker.cards.slice(0, 2)]);
  }
  const chainEntries = entries.filter((e) => e.v <= value("A"));
  for (const seq of windows(
    chainEntries.map((e) => e.v),
    5,
  ))
    out.push(seq.map((v) => entries.find((e) => e.v === v)!.cards[0]));
  for (const seq of windows(
    chainEntries.filter((e) => e.cards.length >= 2).map((e) => e.v),
    3,
  ))
    out.push(
      seq.flatMap((v) => entries.find((e) => e.v === v)!.cards.slice(0, 2)),
    );
  for (const seq of windows(
    chainEntries.filter((e) => e.cards.length >= 3).map((e) => e.v),
    2,
  )) {
    const core = seq.flatMap((v) =>
      entries.find((e) => e.v === v)!.cards.slice(0, 3),
    );
    out.push(core);
    const outside = entries.filter((e) => !seq.includes(e.v));
    for (const singles of choose(outside, seq.length))
      out.push([...core, ...singles.map((e) => e.cards[0])]);
    for (const pairs of choose(
      outside.filter((e) => e.cards.length >= 2),
      seq.length,
    ))
      out.push([...core, ...pairs.flatMap((e) => e.cards.slice(0, 2))]);
  }
  for (const core of entries.filter((e) => e.cards.length === 4)) {
    const outside = entries.filter((e) => e.rank !== core.rank);
    for (const singles of choose(outside, 2))
      out.push([...core.cards, ...singles.map((e) => e.cards[0])]);
    for (const pairs of choose(
      outside.filter((e) => e.cards.length >= 2),
      2,
    ))
      out.push([...core.cards, ...pairs.flatMap((e) => e.cards.slice(0, 2))]);
  }
  const seen = new Set<string>();
  return out
    .filter((cards) => {
      const combo = classifyDoudizhu(cards),
        key = sortCards(cards)
          .map((c) => c.id)
          .join("|");
      if (!combo || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(sortCards);
}

function ddzDeck(seed: number): DdzCard[] {
  const normal = deck(seed).map((c, i) => ({
    id: `${c.rank}${c.suit}-${i}`,
    rank: c.rank as DdzRank,
    suit: c.suit,
  }));
  return sortCards([
    ...normal,
    { id: "BJ", rank: "BJ", suit: "★" },
    { id: "RJ", rank: "RJ", suit: "★" },
  ]).sort(() => 0);
}
function shuffledDdzDeck(seed: number) {
  const cards = ddzDeck(seed);
  let n = seed >>> 0;
  for (let i = cards.length - 1; i > 0; i--) {
    n = (n * 1103515245 + 12345) >>> 0;
    const j = n % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export function newDoudizhu(seed = 4): DdzState {
  const d = shuffledDdzDeck(seed);
  const firstBidder = (((seed * 1664525 + 1013904223) >>> 0) % 3) as 0 | 1 | 2;
  const state: DdzState = {
    phase: "bidding",
    seed,
    firstBidder,
    hands: [
      sortCards(d.slice(0, 17)),
      sortCards(d.slice(17, 34)),
      sortCards(d.slice(34, 51)),
    ],
    kitty: sortCards(d.slice(51)),
    currentPlayer: firstBidder,
    bids: [],
    highestBid: 0,
    highestBidder: null,
    consecutivePasses: 0,
    landlord: null,
    target: null,
    lastPlayer: null,
    multiplier: 1,
    actions: [],
    message:
      firstBidder === 0
        ? "轮到你：看完手牌后选择叫分或不叫。"
        : `AI ${firstBidder} 首先竞叫。`,
  };
  return firstBidder === 0 ? state : autoBidUntilUser(state);
}

function handBid(hand: DdzCard[]) {
  const g = groups(hand);
  let score =
    (g.get("RJ") ? 4 : 0) +
    (g.get("BJ") ? 3 : 0) +
    (g.get("2")?.length || 0) * 2 +
    (g.get("A")?.length || 0);
  for (const cards of g.values()) if (cards.length === 4) score += 6;
  return score >= 14 ? 3 : score >= 9 ? 2 : score >= 5 ? 1 : 0;
}
function finalizeBid(s: DdzState): DdzState {
  if (s.highestBidder === null) {
    const next = newDoudizhu(s.seed + 1);
    return { ...next, message: "无人叫分，已重新发牌" };
  }
  const landlord = s.highestBidder,
    hands = s.hands.map((h, i) =>
      i === landlord ? sortCards([...h, ...s.kitty]) : h,
    ) as [DdzCard[], DdzCard[], DdzCard[]];
  return {
    ...s,
    phase: "playing",
    hands,
    landlord,
    currentPlayer: landlord as 0 | 1 | 2,
    consecutivePasses: 0,
    target: null,
    lastPlayer: null,
    message: `${landlord === 0 ? "你" : `AI ${landlord}`}成为地主，叫分 ${s.highestBid}`,
  };
}
function applyBid(s: DdzState, player: number, bid: number): DdzState {
  const valid = bid === 0 || (bid > s.highestBid && bid <= 3);
  if (!valid) return { ...s, message: "叫分必须高于当前最高分，或选择不叫" };
  const raised = bid > s.highestBid;
  const next = {
    ...s,
    bids: [...s.bids, { player, bid }],
    highestBid: raised ? bid : s.highestBid,
    highestBidder: raised ? player : s.highestBidder,
    consecutivePasses: raised ? 0 : s.consecutivePasses + 1,
    currentPlayer: ((player + 1) % 3) as 0 | 1 | 2,
    message: bid
      ? `${player === 0 ? "你" : `AI ${player}`}叫 ${bid} 分`
      : `${player === 0 ? "你" : `AI ${player}`}不叫`,
  };
  if (
    bid === 3 ||
    (next.highestBidder !== null && next.consecutivePasses >= 2) ||
    (next.highestBidder === null && next.bids.length >= 3)
  )
    return finalizeBid(next);
  return next;
}
export function bidDoudizhu(s: DdzState, bid: number): DdzState {
  if (s.phase !== "bidding" || s.currentPlayer !== 0) return s;
  return autoBidUntilUser(applyBid(s, 0, bid));
}
function autoBidUntilUser(state: DdzState): DdzState {
  let next = state;
  while (next.phase === "bidding" && next.currentPlayer !== 0) {
    const desired = handBid(next.hands[next.currentPlayer]);
    next = applyBid(
      next,
      next.currentPlayer,
      desired > next.highestBid ? desired : 0,
    );
  }
  if (
    next.phase === "bidding" &&
    next.currentPlayer === 0 &&
    next.highestBidder !== null
  ) {
    next = {
      ...next,
      message: `放弃竞叫后，AI ${next.highestBidder} 成为地主并开始出牌。`,
    };
  } else if (next.phase === "bidding" && next.currentPlayer === 0) {
    next = { ...next, message: "轮到你：看完手牌后选择叫分或不叫。" };
  }
  return next;
}

function finish(s: DdzState, winner: number): DdzState {
  const landlordWon = winner === s.landlord,
    heroLandlord = s.landlord === 0,
    heroWon = heroLandlord === landlordWon,
    stake = Math.max(1, s.highestBid) * s.multiplier,
    delta = heroLandlord
      ? heroWon
        ? stake * 2
        : -stake * 2
      : heroWon
        ? stake
        : -stake;
  return {
    ...s,
    phase: "done",
    winner,
    delta,
    message: `${winner === 0 ? "你" : `AI ${winner}`}率先出完 · ${landlordWon ? "地主" : "农民"}获胜`,
  };
}
function applyPlay(s: DdzState, player: number, cards: DdzCard[]): DdzState {
  const combo = classifyDoudizhu(cards);
  if (!combo || !canBeatDoudizhu(combo, s.target?.combo || null))
    return { ...s, message: "所选牌型不合法，或不能压过桌面牌型" };
  const ids = new Set(cards.map((c) => c.id)),
    hand = s.hands[player];
  if (cards.some((c) => !hand.some((h) => h.id === c.id)))
    return { ...s, message: "所选牌不在手牌中" };
  const hands = s.hands.map((h, i) =>
    i === player ? h.filter((c) => !ids.has(c.id)) : h,
  ) as [DdzCard[], DdzCard[], DdzCard[]];
  const next = {
    ...s,
    hands,
    target: { player, cards: sortCards(cards), combo },
    lastPlayer: player,
    consecutivePasses: 0,
    currentPlayer: ((player + 1) % 3) as 0 | 1 | 2,
    multiplier:
      s.multiplier * (combo.type === "bomb" || combo.type === "rocket" ? 2 : 1),
    actions: [
      ...s.actions,
      { player, kind: "play" as const, cards: sortCards(cards), combo },
    ].slice(-12),
    message: `${player === 0 ? "你" : `AI ${player}`}出了${COMBO_NAMES[combo.type]}：${sortCards(
      cards,
    )
      .map((card) => card.rank)
      .join(" ")}`,
  };
  return hands[player].length === 0 ? finish(next, player) : next;
}
function applyPass(s: DdzState, player: number): DdzState {
  if (!s.target) return { ...s, message: "首出不能过牌" };
  const passes = s.consecutivePasses + 1;
  if (passes >= 2)
    return {
      ...s,
      target: null,
      currentPlayer: s.lastPlayer as 0 | 1 | 2,
      consecutivePasses: 0,
      actions: [
        ...s.actions,
        { player, kind: "pass" as const, cards: [] },
      ].slice(-12),
      message: `${player === 0 ? "你" : `AI ${player}`}过牌。两家都过牌，${s.lastPlayer === 0 ? "你" : `AI ${s.lastPlayer}`}重新首出。`,
    };
  return {
    ...s,
    consecutivePasses: passes,
    actions: [...s.actions, { player, kind: "pass" as const, cards: [] }].slice(
      -12,
    ),
    currentPlayer: ((player + 1) % 3) as 0 | 1 | 2,
    message: `${player === 0 ? "你" : `AI ${player}`}过牌`,
  };
}
function removeDoudizhuCards(hand: DdzCard[], cards: DdzCard[]) {
  const ids = new Set(cards.map((card) => card.id));
  return hand.filter((card) => !ids.has(card.id));
}
function handShapeKey(hand: DdzCard[]) {
  const counts = groups(hand);
  return RANKS.map((rank) => counts.get(rank)?.length || 0).join("");
}
function structureBreakCost(hand: DdzCard[], play: DdzCard[]) {
  const before = groups(hand);
  const used = groups(play);
  let cost = 0;
  for (const [rank, cards] of before) {
    const count = used.get(rank)?.length || 0;
    if (!count) continue;
    if (cards.length === 4 && count < 4) cost += 80;
    else if (cards.length === 3 && count < 3) cost += 18;
    else if (cards.length === 2 && count === 1) cost += 4;
  }
  const holdsRocket = before.has("BJ") && before.has("RJ");
  const usesJokers =
    (used.get("BJ")?.length || 0) + (used.get("RJ")?.length || 0);
  if (holdsRocket && usesJokers === 1) cost += 70;
  return cost;
}
function playResourceCost(hand: DdzCard[], play: DdzCard[]) {
  const combo = classifyDoudizhu(play)!;
  const powerCost =
    combo.type === "rocket" ? 36 : combo.type === "bomb" ? 28 : 0;
  return (
    structureBreakCost(hand, play) +
    powerCost -
    play.length * 7 +
    combo.main * 0.2
  );
}
function greedyTurnEstimate(hand: DdzCard[]) {
  let remaining = hand;
  let turns = 0;
  while (remaining.length && turns < 20) {
    const plays = generateDoudizhuPlays(remaining);
    const finishing = plays.find((play) => play.length === remaining.length);
    if (finishing) return turns + 1;
    const best = plays.sort(
      (a, b) => playResourceCost(remaining, a) - playResourceCost(remaining, b),
    )[0];
    if (!best) return turns + remaining.length;
    remaining = removeDoudizhuCards(remaining, best);
    turns += 1;
  }
  return turns;
}
function estimateRemainingTurns(hand: DdzCard[], memo: Map<string, number>) {
  if (!hand.length) return 0;
  const key = handShapeKey(hand);
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  const plays = generateDoudizhuPlays(hand);
  if (plays.some((play) => play.length === hand.length)) {
    memo.set(key, 1);
    return 1;
  }
  const candidates = plays
    .sort((a, b) => playResourceCost(hand, a) - playResourceCost(hand, b))
    .slice(0, hand.length <= 9 ? 24 : 10);
  let best = Number.POSITIVE_INFINITY;
  for (const play of candidates) {
    const remaining = removeDoudizhuCards(hand, play);
    const turns =
      hand.length <= 9
        ? 1 + estimateRemainingTurns(remaining, memo)
        : 1 + greedyTurnEstimate(remaining);
    best = Math.min(best, turns);
  }
  const result = Number.isFinite(best) ? best : hand.length;
  memo.set(key, result);
  return result;
}
function sameDoudizhuTeam(a: number, b: number, landlord: number | null) {
  return landlord !== null && a !== landlord && b !== landlord;
}
function choiceNoise(cards: DdzCard[], seed: number) {
  const hash = cards.reduce(
    (total, card) => total * 31 + card.id.charCodeAt(0) + value(card.rank),
    seed,
  );
  return Math.abs(hash % 7) / 10;
}
export function chooseDoudizhuAiPlay(s: DdzState): DdzCard[] | null {
  if (s.phase !== "playing" || s.currentPlayer === 0) return null;
  const player = s.currentPlayer;
  const hand = s.hands[player];
  const legal = generateDoudizhuPlays(hand).filter((cards) =>
    canBeatDoudizhu(classifyDoudizhu(cards)!, s.target?.combo || null),
  );
  if (!legal.length) return null;
  const finish = legal.find((cards) => cards.length === hand.length);
  if (finish) return finish;

  if (s.target && sameDoudizhuTeam(player, s.target.player, s.landlord)) {
    return null;
  }

  const memo = new Map<string, number>();
  const scored = legal
    .map((cards) => {
      const combo = classifyDoudizhu(cards)!;
      const remaining = removeDoudizhuCards(hand, cards);
      let score = estimateRemainingTurns(remaining, memo) * 100;
      score += structureBreakCost(hand, cards);
      score += combo.type === "rocket" ? 36 : combo.type === "bomb" ? 28 : 0;
      score -= cards.length * (s.target ? 1.5 : 4);
      score += combo.main * (s.target ? 0.7 : 0.25);
      score += choiceNoise(cards, s.seed + s.actions.length * 13 + player * 17);
      if (
        remaining.length &&
        generateDoudizhuPlays(remaining).some(
          (play) => play.length === remaining.length,
        )
      ) {
        score -= 35;
      }
      return { cards, combo, score };
    })
    .sort((a, b) => a.score - b.score);

  const best = scored[0];
  if (
    s.target &&
    (best.combo.type === "bomb" || best.combo.type === "rocket")
  ) {
    const opponentCards = s.hands[s.target.player].length;
    if (opponentCards > 4 && hand.length > best.cards.length + 2) return null;
  }
  return best.cards;
}
function runAi(state: DdzState): DdzState {
  let s = state,
    guard = 0;
  while (s.phase === "playing" && s.currentPlayer !== 0 && guard++ < 100) {
    s = stepDoudizhuAi(s);
  }
  return s;
}
export function stepDoudizhuAi(s: DdzState): DdzState {
  if (s.phase !== "playing" || s.currentPlayer === 0) return s;
  const choice = chooseDoudizhuAiPlay(s);
  return choice
    ? applyPlay(s, s.currentPlayer, choice)
    : applyPass(s, s.currentPlayer);
}
export function playDoudizhu(
  s: DdzState,
  cardIds: string[],
  autoAi = true,
): DdzState {
  if (s.phase !== "playing" || s.currentPlayer !== 0) return s;
  const cards = s.hands[0].filter((c) => cardIds.includes(c.id));
  const next = applyPlay(s, 0, cards);
  return autoAi ? runAi(next) : next;
}
export function passDoudizhu(s: DdzState, autoAi = true): DdzState {
  if (s.phase !== "playing" || s.currentPlayer !== 0) return s;
  const next = applyPass(s, 0);
  return autoAi ? runAi(next) : next;
}
export function legalDoudizhuSelection(s: DdzState, cardIds: string[]) {
  const cards = s.hands[0].filter((c) => cardIds.includes(c.id)),
    combo = classifyDoudizhu(cards);
  return {
    combo,
    legal: Boolean(combo && canBeatDoudizhu(combo, s.target?.combo || null)),
  };
}
