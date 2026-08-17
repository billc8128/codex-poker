import { Card, deck, rankValue } from "./cards";
export type BjHand = {
  cards: Card[];
  bet: number;
  status: "active" | "stand" | "bust";
  splitAces: boolean;
};
export type BlackjackState = {
  phase: "player" | "dealer" | "done";
  hands: BjHand[];
  activeHand: number;
  dealer: Card[];
  shoe: Card[];
  splitUsed: boolean;
  result?: string;
  delta?: number;
};
const sixDecks = (seed: number) => {
  const cards = Array.from({ length: 6 }, (_, i) => deck(seed + i * 97)).flat();
  let n = seed >>> 0;
  for (let i = cards.length - 1; i > 0; i--) {
    n = (n * 1664525 + 1013904223) >>> 0;
    const j = n % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
};
const cardPoints = (c: Card) =>
  c.rank === "A" ? 11 : Math.min(10, rankValue(c.rank));
export function blackjackValue(hand: Card[]) {
  let total = hand.reduce((n, c) => n + cardPoints(c), 0),
    aces = hand.filter((c) => c.rank === "A").length;
  while (total > 21 && aces-- > 0) total -= 10;
  return total;
}
export function blackjackSoft(hand: Card[]) {
  const raw = hand.reduce((n, c) => n + cardPoints(c), 0);
  return hand.some((c) => c.rank === "A") && raw <= 21;
}
const natural = (cards: Card[]) =>
  cards.length === 2 && blackjackValue(cards) === 21;
function draw(shoe: Card[]) {
  return { card: shoe[0], shoe: shoe.slice(1) };
}
export function newBlackjack(seed = 1): BlackjackState {
  let shoe = sixDecks(seed);
  const p1 = draw(shoe);
  shoe = p1.shoe;
  const d1 = draw(shoe);
  shoe = d1.shoe;
  const p2 = draw(shoe);
  shoe = p2.shoe;
  const d2 = draw(shoe);
  shoe = d2.shoe;
  let state: BlackjackState = {
    phase: "player",
    hands: [
      {
        cards: [p1.card, p2.card],
        bet: 100,
        status: "active",
        splitAces: false,
      },
    ],
    activeHand: 0,
    dealer: [d1.card, d2.card],
    shoe,
    splitUsed: false,
  };
  const playerBj = natural(state.hands[0].cards),
    dealerBj = natural(state.dealer);
  if (playerBj || dealerBj)
    state = {
      ...state,
      phase: "done",
      delta: playerBj && !dealerBj ? 150 : dealerBj && !playerBj ? -100 : 0,
      result:
        playerBj && !dealerBj
          ? "Blackjack · 3:2"
          : dealerBj && !playerBj
            ? "庄家 Blackjack"
            : "双方 Blackjack · 和局",
    };
  return state;
}
function advance(state: BlackjackState): BlackjackState {
  const next = state.hands.findIndex(
    (h, i) => i > state.activeHand && h.status === "active",
  );
  return next >= 0
    ? { ...state, activeHand: next }
    : dealerTurn({ ...state, phase: "dealer" });
}
export function hit(s: BlackjackState): BlackjackState {
  if (s.phase !== "player") return s;
  const hand = s.hands[s.activeHand];
  if (hand.status !== "active" || hand.splitAces) return s;
  const { card, shoe } = draw(s.shoe),
    cards = [...hand.cards, card],
    status =
      blackjackValue(cards) > 21 ? ("bust" as const) : ("active" as const),
    hands = s.hands.map((h, i) =>
      i === s.activeHand ? { ...h, cards, status } : h,
    );
  const next = { ...s, hands, shoe };
  return status === "bust" ? advance(next) : next;
}
export function stand(s: BlackjackState): BlackjackState {
  if (s.phase !== "player") return s;
  const hands = s.hands.map((h, i) =>
    i === s.activeHand ? { ...h, status: "stand" as const } : h,
  );
  return advance({ ...s, hands });
}
export function doubleBlackjack(s: BlackjackState): BlackjackState {
  if (s.phase !== "player") return s;
  const hand = s.hands[s.activeHand];
  if (hand.status !== "active" || hand.cards.length !== 2 || hand.splitAces)
    return s;
  const { card, shoe } = draw(s.shoe),
    cards = [...hand.cards, card],
    hands = s.hands.map((h, i) =>
      i === s.activeHand
        ? {
            ...h,
            cards,
            bet: h.bet * 2,
            status: (blackjackValue(cards) > 21 ? "bust" : "stand") as
              "bust" | "stand",
          }
        : h,
    );
  return advance({ ...s, hands, shoe });
}
export function canSplitBlackjack(s: BlackjackState) {
  const hand = s.hands[s.activeHand];
  return (
    s.phase === "player" &&
    !s.splitUsed &&
    hand?.status === "active" &&
    hand.cards.length === 2 &&
    cardPoints(hand.cards[0]) === cardPoints(hand.cards[1])
  );
}
export function splitBlackjack(s: BlackjackState): BlackjackState {
  if (!canSplitBlackjack(s)) return s;
  let shoe = s.shoe;
  const first = draw(shoe);
  shoe = first.shoe;
  const second = draw(shoe);
  shoe = second.shoe;
  const original = s.hands[s.activeHand],
    aces = original.cards[0].rank === "A" && original.cards[1].rank === "A";
  const splitHands: BjHand[] = [
    {
      cards: [original.cards[0], first.card],
      bet: original.bet,
      status: aces ? "stand" : "active",
      splitAces: aces,
    },
    {
      cards: [original.cards[1], second.card],
      bet: original.bet,
      status: aces ? "stand" : "active",
      splitAces: aces,
    },
  ];
  const hands = [
      ...s.hands.slice(0, s.activeHand),
      ...splitHands,
      ...s.hands.slice(s.activeHand + 1),
    ],
    next = { ...s, hands, shoe, splitUsed: true };
  return aces ? dealerTurn({ ...next, phase: "dealer" }) : next;
}
function dealerTurn(s: BlackjackState): BlackjackState {
  const dealer = [...s.dealer];
  let shoe = [...s.shoe];
  if (s.hands.every((h) => h.status === "bust"))
    return settle({ ...s, dealer, shoe });
  while (blackjackValue(dealer) < 17) {
    const next = draw(shoe);
    dealer.push(next.card);
    shoe = next.shoe;
  }
  return settle({ ...s, dealer, shoe });
}
function settle(s: BlackjackState): BlackjackState {
  const dealerValue = blackjackValue(s.dealer),
    dealerBust = dealerValue > 21,
    dealerNatural = natural(s.dealer);
  let delta = 0;
  const labels: string[] = [];
  s.hands.forEach((hand, i) => {
    const v = blackjackValue(hand.cards);
    let gain = 0;
    if (hand.status === "bust") gain = -hand.bet;
    else if (dealerNatural) gain = -hand.bet;
    else if (dealerBust || v > dealerValue) gain = hand.bet;
    else if (v < dealerValue) gain = -hand.bet;
    delta += gain;
    labels.push(`第${i + 1}手 ${gain > 0 ? "胜" : gain < 0 ? "负" : "和"}`);
  });
  return { ...s, phase: "done", delta, result: labels.join(" · ") };
}
