import { Card, deck, pokerScore, rankValue } from "./cards";

export type HoldemStreet = "preflop" | "flop" | "turn" | "river" | "done";
export type HoldemSeat = 0 | 1 | 2 | 3 | 4 | 5;
export type HoldemAction = "fold" | "check" | "call" | "raise" | "allin";
type Six<T> = [T, T, T, T, T, T];

export type HoldemPlayer = {
  stack: number;
  streetBet: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
};

export type HoldemLog = {
  player: HoldemSeat;
  action: HoldemAction;
  amount: number;
  street: HoldemStreet;
};

export type HoldemState = {
  seed: number;
  street: HoldemStreet;
  hands: Six<Card[]>;
  board: Card[];
  shoe: Card[];
  players: Six<HoldemPlayer>;
  pot: number;
  actor: HoldemSeat;
  dealer: HoldemSeat;
  smallBlind: HoldemSeat;
  bigBlind: HoldemSeat;
  currentBet: number;
  minRaise: number;
  acted: Six<boolean>;
  actions: HoldemLog[];
  message: string;
  result?: string;
  delta?: number;
  winners?: HoldemSeat[];
  autoAi: boolean;
};

export type HoldemDecision = {
  action: HoldemAction;
  target?: number;
  reason: string;
};

export const HOLDEM_AI_PROFILES = [
  { name: "你", aggression: 0, looseness: 0, bluff: 0 },
  { name: "岩石", aggression: 0.28, looseness: 0.16, bluff: 0.03 },
  { name: "猎手", aggression: 0.72, looseness: 0.42, bluff: 0.16 },
  { name: "算手", aggression: 0.46, looseness: 0.24, bluff: 0.07 },
  { name: "跟注站", aggression: 0.2, looseness: 0.7, bluff: 0.02 },
  { name: "均衡", aggression: 0.54, looseness: 0.38, bluff: 0.1 },
] as const;

const seats = [0, 1, 2, 3, 4, 5] as const;
const asSeat = (value: number) => ((value + 6) % 6) as HoldemSeat;
const playerName = (seat: HoldemSeat) => (seat === 0 ? "你" : `AI ${seat}`);
const freshPlayer = (): HoldemPlayer => ({
  stack: 1000,
  streetBet: 0,
  totalBet: 0,
  folded: false,
  allIn: false,
});
const freshBooleans = () =>
  [false, false, false, false, false, false] as Six<boolean>;

const pay = (player: HoldemPlayer, amount: number) => {
  const paid = Math.min(player.stack, amount);
  return [
    {
      ...player,
      stack: player.stack - paid,
      streetBet: player.streetBet + paid,
      totalBet: player.totalBet + paid,
      allIn: player.stack === paid,
    },
    paid,
  ] as const;
};

function nextSeatMatching(
  s: HoldemState,
  from: HoldemSeat,
  predicate: (seat: HoldemSeat) => boolean,
) {
  for (let step = 1; step <= 6; step++) {
    const seat = asSeat(from + step);
    if (predicate(seat)) return seat;
  }
  return from;
}

const activeSeats = (s: HoldemState) =>
  seats.filter((seat) => !s.players[seat].folded);
const actionableSeats = (s: HoldemState) =>
  seats.filter(
    (seat) => !s.players[seat].folded && !s.players[seat].allIn,
  );
const needsAction = (s: HoldemState, seat: HoldemSeat) => {
  const player = s.players[seat];
  return (
    !player.folded &&
    !player.allIn &&
    (!s.acted[seat] || player.streetBet !== s.currentBet)
  );
};

export function newHoldem(
  seed = 3,
  dealerSeat: HoldemSeat = asSeat(seed % 6),
  autoAi = true,
  playerCount = 6,
): HoldemState {
  const cards = deck(seed);
  const hands = seats.map((seat) => [cards[seat], cards[seat + 6]]) as Six<
    Card[]
  >;
  const players = seats.map(() => freshPlayer()) as Six<HoldemPlayer>;
  const dealer = dealerSeat,
    smallBlind = asSeat(dealer + 1),
    bigBlind = asSeat(dealer + 2);
  let smallPaid: number, bigPaid: number;
  [players[smallBlind], smallPaid] = pay(players[smallBlind], 10);
  [players[bigBlind], bigPaid] = pay(players[bigBlind], 20);
  seats.forEach((seat) => {
    if (seat >= playerCount) players[seat] = { ...players[seat], folded: true };
  });
  let actor = asSeat(bigBlind + 1);
  while (players[actor].folded) actor = asSeat(actor + 1);
  const state: HoldemState = {
    seed,
    street: "preflop",
    hands,
    board: [],
    shoe: cards.slice(12),
    players,
    pot: smallPaid + bigPaid,
    actor,
    dealer,
    smallBlind,
    bigBlind,
    currentBet: 20,
    minRaise: 20,
    acted: freshBooleans(),
    actions: [],
    autoAi,
    message: `翻牌前 · ${playerName(smallBlind)}下小盲 10，${playerName(bigBlind)}下大盲 20`,
  };
  return autoAi ? runAi(state) : state;
}

export function holdemToCall(s: HoldemState, player = s.actor) {
  return Math.max(0, s.currentBet - s.players[player].streetBet);
}

export function legalHoldemActions(s: HoldemState): HoldemAction[] {
  if (s.street === "done") return [];
  const player = s.players[s.actor],
    toCall = holdemToCall(s),
    maxTarget = player.streetBet + player.stack;
  if (player.folded || player.allIn) return [];
  const actions: HoldemAction[] = ["fold", toCall ? "call" : "check"];
  if (maxTarget >= s.currentBet + s.minRaise) actions.push("raise");
  if (player.stack > 0) actions.push("allin");
  return actions;
}

function finishUncontested(s: HoldemState, winner: HoldemSeat): HoldemState {
  const players = s.players.map((player) => ({ ...player })) as Six<HoldemPlayer>;
  players[winner].stack += s.pot;
  const result = `${playerName(winner)}赢得底池 · 其余玩家均已弃牌`;
  return {
    ...s,
    street: "done",
    players,
    actor: winner,
    result,
    message: result,
    delta: players[0].stack - 1000,
    winners: [winner],
  };
}

function showdown(s: HoldemState): HoldemState {
  const players = s.players.map((player) => ({ ...player })) as Six<HoldemPlayer>,
    payouts = [0, 0, 0, 0, 0, 0],
    levels = [
      ...new Set(players.map((player) => player.totalBet).filter(Boolean)),
    ].sort((a, b) => a - b);
  let previous = 0;
  for (const level of levels) {
    const contributors = seats.filter(
        (seat) => players[seat].totalBet >= level,
      ),
      eligible = contributors.filter((seat) => !players[seat].folded),
      amount = (level - previous) * contributors.length;
    previous = level;
    if (!eligible.length) continue;
    const scores = eligible.map((seat) => ({
        seat,
        score: pokerScore([...s.hands[seat], ...s.board]),
      })),
      best = Math.max(...scores.map(({ score }) => score)),
      winners = scores
        .filter(({ score }) => score === best)
        .map(({ seat }) => seat),
      share = Math.floor(amount / winners.length);
    winners.forEach((seat, index) => {
      payouts[seat] += share + (index < amount % winners.length ? 1 : 0);
    });
  }
  seats.forEach((seat) => {
    players[seat].stack += payouts[seat];
  });
  const winners = seats.filter((seat) => payouts[seat] > 0);
  const result = winners
    .sort((a, b) => payouts[b] - payouts[a])
    .map((seat) => `${playerName(seat)}赢得 ${payouts[seat]} Mtok`)
    .join(" · ");
  return {
    ...s,
    street: "done",
    players,
    result,
    message: result,
    delta: players[0].stack - 1000,
    winners,
  };
}

function runout(s: HoldemState): HoldemState {
  const needed = 5 - s.board.length;
  return showdown({
    ...s,
    board: [...s.board, ...s.shoe.slice(0, needed)],
    shoe: s.shoe.slice(needed),
  });
}

function advanceStreet(s: HoldemState): HoldemState {
  if (s.street === "river") return showdown(s);
  const deal = s.street === "preflop" ? 3 : 1,
    street: HoldemStreet =
      s.street === "preflop" ? "flop" : s.street === "flop" ? "turn" : "river",
    players = s.players.map((player) => ({
      ...player,
      streetBet: 0,
    })) as Six<HoldemPlayer>;
  let next: HoldemState = {
    ...s,
    street,
    board: [...s.board, ...s.shoe.slice(0, deal)],
    shoe: s.shoe.slice(deal),
    players,
    currentBet: 0,
    minRaise: 20,
    acted: freshBooleans(),
    message: `${street} · 新一轮下注`,
  };
  if (actionableSeats(next).length <= 1) return runout(next);
  next = {
    ...next,
    actor: nextSeatMatching(
      next,
      next.dealer,
      (seat) => !next.players[seat].folded && !next.players[seat].allIn,
    ),
  };
  return next;
}

function bettingRoundComplete(s: HoldemState) {
  return seats.every((seat) => {
    const player = s.players[seat];
    return (
      player.folded ||
      player.allIn ||
      (s.acted[seat] && player.streetBet === s.currentBet)
    );
  });
}

function afterAction(s: HoldemState, player: HoldemSeat): HoldemState {
  const alive = activeSeats(s);
  if (alive.length === 1) return finishUncontested(s, alive[0]);
  if (bettingRoundComplete(s)) {
    if (s.street === "river") return showdown(s);
    if (actionableSeats(s).length <= 1) return runout(s);
    return advanceStreet(s);
  }
  return {
    ...s,
    actor: nextSeatMatching(s, player, (seat) => needsAction(s, seat)),
  };
}

function logAction(
  s: HoldemState,
  player: HoldemSeat,
  action: HoldemAction,
  amount: number,
) {
  return [...s.actions, { player, action, amount, street: s.street }];
}

function applyAction(
  s: HoldemState,
  player: HoldemSeat,
  action: HoldemAction,
  target?: number,
): HoldemState {
  if (s.street === "done" || s.actor !== player) return s;
  const toCall = holdemToCall(s, player),
    who = playerName(player);
  if (action === "fold") {
    const players = s.players.map((item, seat) =>
        seat === player ? { ...item, folded: true } : item,
      ) as Six<HoldemPlayer>,
      acted = s.acted.map((value, seat) =>
        seat === player ? true : value,
      ) as Six<boolean>;
    return afterAction(
      {
        ...s,
        players,
        acted,
        actions: logAction(s, player, action, 0),
        message: `${who}弃牌`,
      },
      player,
    );
  }
  if (action === "check") {
    if (toCall) return { ...s, message: "面对下注不能过牌" };
    const acted = s.acted.map((value, seat) =>
      seat === player ? true : value,
    ) as Six<boolean>;
    return afterAction(
      {
        ...s,
        acted,
        actions: logAction(s, player, action, 0),
        message: `${who}过牌`,
      },
      player,
    );
  }
  if (action === "call") {
    if (!toCall) return applyAction(s, player, "check");
    const [paid, amount] = pay(s.players[player], toCall),
      players = s.players.map((item, seat) =>
        seat === player ? paid : item,
      ) as Six<HoldemPlayer>,
      acted = s.acted.map((value, seat) =>
        seat === player ? true : value,
      ) as Six<boolean>;
    return afterAction(
      {
        ...s,
        players,
        pot: s.pot + amount,
        acted,
        actions: logAction(s, player, action, amount),
        message: `${who}${paid.allIn ? "全下跟注" : "跟注"} ${amount}`,
      },
      player,
    );
  }
  const maxTarget = s.players[player].streetBet + s.players[player].stack,
    desired =
      action === "allin"
        ? maxTarget
        : Math.min(maxTarget, target ?? s.currentBet + s.minRaise);
  if (desired <= s.currentBet) return applyAction(s, player, "call");
  const raiseSize = desired - s.currentBet;
  if (action !== "allin" && raiseSize < s.minRaise)
    return { ...s, message: `最小加注到 ${s.currentBet + s.minRaise}` };
  const [paid, amount] = pay(
      s.players[player],
      desired - s.players[player].streetBet,
    ),
    players = s.players.map((item, seat) =>
      seat === player ? paid : item,
    ) as Six<HoldemPlayer>,
    fullRaise = raiseSize >= s.minRaise,
    acted = fullRaise ? freshBooleans() : ([...s.acted] as Six<boolean>);
  acted[player] = true;
  return afterAction(
    {
      ...s,
      players,
      pot: s.pot + amount,
      currentBet: Math.max(s.currentBet, paid.streetBet),
      minRaise: fullRaise ? raiseSize : s.minRaise,
      acted,
      actions: logAction(s, player, action, paid.streetBet),
      message: `${who}${action === "allin" ? "全下至" : "加注到"} ${paid.streetBet}`,
    },
    player,
  );
}

function preflopStrength(cards: Card[]) {
  const values = cards.map((card) => rankValue(card.rank)).sort((a, b) => b - a),
    [high, low] = values,
    pair = high === low,
    suited = cards[0].suit === cards[1].suit,
    gap = high - low;
  let strength = pair
    ? 0.48 + high / 28
    : 0.12 + high / 28 + low / 56 + (suited ? 0.07 : 0);
  if (!pair && gap <= 2) strength += 0.06 - gap * 0.015;
  if (!pair && high === 14) strength += 0.05;
  return Math.max(0.05, Math.min(0.98, strength));
}

export function holdemHandStrength(s: HoldemState, player: HoldemSeat) {
  if (s.street === "preflop") return preflopStrength(s.hands[player]);
  const score = pokerScore([...s.hands[player], ...s.board]),
    category = Math.floor(score / 15 ** 5),
    high = Math.max(...s.hands[player].map((card) => rankValue(card.rank)));
  return Math.min(0.99, 0.2 + category * 0.09 + high / 70);
}

function decisionNoise(s: HoldemState, player: HoldemSeat) {
  let value =
    (s.seed + (s.actions.length + 1) * 2654435761 + player * 1013904223) >>>
    0;
  value = (value * 1664525 + 1013904223) >>> 0;
  return (value % 1000) / 1000;
}

export function chooseHoldemAiAction(
  s: HoldemState,
  player: HoldemSeat = s.actor,
): HoldemDecision {
  const profile = HOLDEM_AI_PROFILES[player],
    handStrength = holdemHandStrength(s, player),
    toCall = holdemToCall(s, player),
    pressure = toCall / Math.max(1, s.pot + toCall),
    noise = decisionNoise(s, player),
    position = (player - s.dealer + 6) % 6,
    positionBonus =
      position === 0 ? 0.07 : position === 5 ? 0.05 : position === 4 ? 0.02 : position === 3 ? -0.03 : 0,
    confidence =
      handStrength +
      profile.looseness * 0.16 +
      positionBonus -
      pressure * 0.9 +
      noise * 0.08,
    playerState = s.players[player],
    canRaise =
      playerState.streetBet + playerState.stack >=
      s.currentBet + s.minRaise;
  if (toCall > 0 && confidence < 0.27)
    return { action: "fold", reason: "牌力不足以承担当前底池压力" };
  const wantsRaise =
    canRaise &&
    (confidence > 0.7 ||
      noise < profile.bluff * (s.street === "preflop" ? 0.5 : 1));
  if (wantsRaise) {
    const raiseSize = Math.max(
        s.minRaise,
        Math.round((s.pot * (0.32 + profile.aggression * 0.38)) / 10) * 10,
      ),
      target = Math.min(
        playerState.streetBet + playerState.stack,
        s.currentBet + raiseSize,
      );
    return {
      action:
        target === playerState.streetBet + playerState.stack
          ? "allin"
          : "raise",
      target,
      reason:
        confidence > 0.7
          ? "牌力领先，主动做大底池"
          : "利用位置与对手压力诈唬",
    };
  }
  if (toCall > 0)
    return { action: "call", reason: "牌力与底池赔率允许继续" };
  return { action: "check", reason: "控制底池并保留后续行动" };
}

function runAi(state: HoldemState): HoldemState {
  let s = state,
    guard = 0;
  while (s.street !== "done" && s.actor !== 0 && guard++ < 120) {
    const player = s.actor,
      decision = chooseHoldemAiAction(s, player);
    s = applyAction(s, player, decision.action, decision.target);
  }
  if (s.street !== "done" && s.actor === 0) {
    const toCall = holdemToCall(s, 0);
    s = {
      ...s,
      message: `${s.message} · 轮到你${toCall ? `，需跟注 ${toCall}` : "行动"}`,
    };
  }
  return s;
}

export function actHoldem(
  s: HoldemState,
  action: HoldemAction,
  target?: number,
) {
  return actHoldemPlayer(s, 0, action, target);
}

export function actHoldemPlayer(
  s: HoldemState,
  player: HoldemSeat,
  action: HoldemAction,
  target?: number,
) {
  if (s.actor !== player) return s;
  const next = applyAction(s, player, action, target);
  return s.autoAi && player === 0 ? runAi(next) : next;
}

export const checkHoldem = (s: HoldemState) =>
  actHoldem(s, holdemToCall(s) ? "call" : "check");
export const foldHoldem = (s: HoldemState) => actHoldem(s, "fold");
export const raiseHoldem = (s: HoldemState, target?: number) =>
  actHoldem(s, "raise", target);
export const allInHoldem = (s: HoldemState) => actHoldem(s, "allin");
