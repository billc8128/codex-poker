import { Card, deck, rankValue } from "./cards";
export type ZjhCategory =
  "high" | "pair" | "straight" | "flush" | "straight-flush" | "trips";
export type ZjhRank = {
  category: ZjhCategory;
  level: number;
  tiebreak: number[];
  special235: boolean;
};
export type ZjhState = {
  phase: "betting" | "done";
  hands: [Card[], Card[], Card[]];
  active: [boolean, boolean, boolean];
  seen: [boolean, boolean, boolean];
  pot: number;
  stake: 10 | 20 | 40;
  contributions: [number, number, number];
  round: number;
  actor: 0 | 1 | 2;
  message: string;
  result?: string;
  delta?: number;
  winner?: number;
  autoAi: boolean;
};
const categoryLevel: Record<ZjhCategory, number> = {
  high: 0,
  pair: 1,
  straight: 2,
  flush: 3,
  "straight-flush": 4,
  trips: 5,
};
export function rankZhajinhua(cards: Card[]): ZjhRank {
  const values = cards.map((c) => rankValue(c.rank)).sort((a, b) => b - a),
    sameSuit = cards.every((c) => c.suit === cards[0].suit),
    wheel = values.join(",") === "14,3,2",
    straight =
      new Set(values).size === 3 && (values[0] - values[2] === 2 || wheel),
    counts = [...new Set(values)]
      .map((v) => ({ v, n: values.filter((x) => x === v).length }))
      .sort((a, b) => b.n - a.n || b.v - a.v);
  let category: ZjhCategory = "high",
    tiebreak = values;
  if (counts[0].n === 3) {
    category = "trips";
    tiebreak = [counts[0].v];
  } else if (sameSuit && straight) {
    category = "straight-flush";
    tiebreak = [wheel ? 3 : values[0]];
  } else if (sameSuit) category = "flush";
  else if (straight) {
    category = "straight";
    tiebreak = [wheel ? 3 : values[0]];
  } else if (counts[0].n === 2) {
    category = "pair";
    tiebreak = [counts[0].v, counts[1].v];
  }
  const special235 = !sameSuit && values.join(",") === "5,3,2";
  return { category, level: categoryLevel[category], tiebreak, special235 };
}
export function compareZhajinhua(a: Card[], b: Card[]) {
  const ra = rankZhajinhua(a),
    rb = rankZhajinhua(b);
  if (ra.special235 && rb.category === "trips") return 1;
  if (rb.special235 && ra.category === "trips") return -1;
  if (ra.level !== rb.level) return ra.level - rb.level;
  for (let i = 0; i < Math.max(ra.tiebreak.length, rb.tiebreak.length); i++)
    if ((ra.tiebreak[i] || 0) !== (rb.tiebreak[i] || 0))
      return (ra.tiebreak[i] || 0) - (rb.tiebreak[i] || 0);
  return 0;
}
export function newZhajinhua(seed = 2, autoAi = true): ZjhState {
  const d = deck(seed);
  return {
    phase: "betting",
    hands: [
      [d[0], d[3], d[6]],
      [d[1], d[4], d[7]],
      [d[2], d[5], d[8]],
    ],
    active: [true, true, true],
    seen: [false, false, false],
    pot: 30,
    stake: 10,
    contributions: [10, 10, 10],
    round: 1,
    actor: 0,
    message: "第 1 轮 · 轮到你行动",
    autoAi,
  };
}
const callCost = (s: ZjhState, p: number) => s.stake * (s.seen[p] ? 2 : 1);
function finish(s: ZjhState, winner: number, message: string): ZjhState {
  const delta = winner === 0 ? s.pot - s.contributions[0] : -s.contributions[0];
  return { ...s, phase: "done", winner, delta, result: message, message };
}
function oneLeft(s: ZjhState) {
  const alive = s.active.flatMap((a, i) => (a ? [i] : []));
  return alive.length === 1
    ? finish(
        s,
        alive[0],
        alive[0] === 0 ? "你赢得底池" : `AI ${alive[0]} 赢得底池`,
      )
    : s;
}
function pay(s: ZjhState, p: number, amount: number) {
  const contributions = s.contributions.map((v, i) =>
    i === p ? v + amount : v,
  ) as [number, number, number];
  return { ...s, pot: s.pot + amount, contributions };
}
function nextActive(s: ZjhState, from: number) {
  for (let step = 1; step <= 3; step++) {
    const p = (from + step) % 3;
    if (s.active[p]) return p as 0 | 1 | 2;
  }
  return from as 0 | 1 | 2;
}
function advance(s: ZjhState, from: number) {
  const actor = nextActive(s, from),
    round = s.round + (actor <= from ? 1 : 0);
  return {
    ...s,
    actor,
    round,
    message: `第 ${round} 轮 · ${actor === 0 ? "轮到你" : `AI ${actor} 行动`}`,
  };
}
function comparePlayers(s: ZjhState, challenger: number, target: number) {
  const amount = callCost(s, challenger) * 2;
  let next = pay(s, challenger, amount);
  const cmp = compareZhajinhua(next.hands[challenger], next.hands[target]),
    loser = cmp > 0 ? target : challenger,
    active = next.active.map((a, i) => (i === loser ? false : a)) as [
      boolean,
      boolean,
      boolean,
    ];
  next = {
    ...next,
    active,
    message: `${challenger === 0 ? "你" : `AI ${challenger}`} 与 ${target === 0 ? "你" : `AI ${target}`} 比牌，${loser === 0 ? "你" : `AI ${loser}`} 淘汰`,
  };
  return oneLeft(next);
}
function runAi(state: ZjhState): ZjhState {
  let s = state,
    guard = 0;
  while (s.phase === "betting" && s.actor !== 0 && guard++ < 30) {
    const p = s.actor;
    if (s.round >= 6) {
      const targets = s.active.flatMap((a, i) => (a && i !== p ? [i] : []));
      s = comparePlayers(s, p, targets[0]);
      if (s.phase === "done") return s;
      s = advance(s, p);
    } else {
      s = pay(s, p, callCost(s, p));
      s = advance(s, p);
    }
  }
  return s;
}
export const seeCards = (s: ZjhState): ZjhState =>
  seeZhajinhuaCards(s, 0);
export function seeZhajinhuaCards(
  s: ZjhState,
  player: 0 | 1 | 2,
): ZjhState {
  if (s.phase !== "betting" || s.actor !== player) return s;
  const seen = s.seen.map((value, index) =>
    index === player ? true : value,
  ) as [boolean, boolean, boolean];
  return {
    ...s,
    seen,
    message: `${player === 0 ? "你" : `AI ${player}`}已看牌；后续跟注成本翻倍`,
  };
}
export function callZhajinhua(s: ZjhState): ZjhState {
  return callZhajinhuaPlayer(s, 0);
}
export function callZhajinhuaPlayer(
  s: ZjhState,
  player: 0 | 1 | 2,
): ZjhState {
  if (s.phase !== "betting" || s.actor !== player) return s;
  const next = advance(pay(s, player, callCost(s, player)), player);
  return s.autoAi && player === 0 ? runAi(next) : next;
}
export function raiseZhajinhua(s: ZjhState, stake: 20 | 40): ZjhState {
  return raiseZhajinhuaPlayer(s, 0, stake);
}
export function raiseZhajinhuaPlayer(
  s: ZjhState,
  player: 0 | 1 | 2,
  stake: 20 | 40,
): ZjhState {
  if (s.phase !== "betting" || s.actor !== player || stake <= s.stake) return s;
  const next = { ...s, stake };
  const advanced = advance(pay(next, player, callCost(next, player)), player);
  return s.autoAi && player === 0 ? runAi(advanced) : advanced;
}
export function compareZhajinhuaAction(s: ZjhState, target: number): ZjhState {
  return compareZhajinhuaPlayer(s, 0, target);
}
export function compareZhajinhuaPlayer(
  s: ZjhState,
  player: 0 | 1 | 2,
  target: number,
): ZjhState {
  if (
    s.phase !== "betting" ||
    s.actor !== player ||
    s.round < 2 ||
    !s.active[target] ||
    target === player
  )
    return { ...s, message: "第二轮起才能与仍在局的玩家比牌" };
  const next = comparePlayers(s, player, target);
  if (next.phase === "done") return next;
  const advanced = advance(next, player);
  return s.autoAi && player === 0 ? runAi(advanced) : advanced;
}
export function foldZjh(s: ZjhState): ZjhState {
  return foldZhajinhuaPlayer(s, 0);
}
export function foldZhajinhuaPlayer(
  s: ZjhState,
  player: 0 | 1 | 2,
): ZjhState {
  if (s.phase !== "betting" || s.actor !== player) return s;
  const folded = oneLeft({
    ...s,
    active: s.active.map((value, index) =>
      index === player ? false : value,
    ) as [boolean, boolean, boolean],
    message: `${player === 0 ? "你" : `AI ${player}`}已弃牌`,
  });
  if (folded.phase === "done") return folded;
  const advanced = advance(folded, player);
  return s.autoAi && player === 0 ? runAi(advanced) : advanced;
}
export function showdownZjh(s: ZjhState): ZjhState {
  if (s.phase !== "betting") return s;
  const alive = s.active.flatMap((a, i) => (a ? [i] : [])),
    winner = alive.reduce(
      (best, p) => (compareZhajinhua(s.hands[p], s.hands[best]) > 0 ? p : best),
      alive[0],
    );
  return finish(
    s,
    winner,
    winner === 0 ? "你在开牌中获胜" : `AI ${winner} 在开牌中获胜`,
  );
}
