export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank =
  "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
export type Card = { suit: Suit; rank: Rank };
export const rankValue = (rank: Rank) =>
  "23456789TJQKA".indexOf(rank === "10" ? "T" : rank) + 2;
export function deck(seed = 1): Card[] {
  const cards = (["♠", "♥", "♦", "♣"] as Suit[]).flatMap((suit) =>
    (
      [
        "2",
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
      ] as Rank[]
    ).map((rank) => ({ suit, rank })),
  );
  let n = seed >>> 0;
  for (let i = cards.length - 1; i > 0; i--) {
    n = (n * 1664525 + 1013904223) >>> 0;
    const j = n % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export const cardLabel = (c: Card) => `${c.rank}${c.suit}`;
export const randomGameSeed = () =>
  crypto.getRandomValues(new Uint32Array(1))[0];
const pack = (category: number, values: number[]) =>
  [category, ...values, ...Array(5 - values.length).fill(0)].reduce(
    (score, value) => score * 15 + value,
    0,
  );
const straightHigh = (values: number[]) => {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique[0] === 14) unique.push(1);
  for (let i = 0; i <= unique.length - 5; i++)
    if (unique[i] - unique[i + 4] === 4) return unique[i];
  return 0;
};
function scoreFive(cards: Card[]) {
  const values = cards.map((c) => rankValue(c.rank)).sort((a, b) => b - a);
  const groups = [...new Set(values)]
    .map((v) => [v, values.filter((x) => x === v).length] as const)
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((c) => c.suit === cards[0].suit),
    straight = straightHigh(values);
  if (flush && straight) return pack(8, [straight]);
  if (groups[0][1] === 4) return pack(7, [groups[0][0], groups[1][0]]);
  if (groups[0][1] === 3 && groups[1][1] === 2)
    return pack(6, [groups[0][0], groups[1][0]]);
  if (flush) return pack(5, values);
  if (straight) return pack(4, [straight]);
  if (groups[0][1] === 3)
    return pack(3, [groups[0][0], ...groups.slice(1).map((g) => g[0])]);
  if (groups[0][1] === 2 && groups[1][1] === 2)
    return pack(2, [groups[0][0], groups[1][0], groups[2][0]]);
  if (groups[0][1] === 2)
    return pack(1, [groups[0][0], ...groups.slice(1).map((g) => g[0])]);
  return pack(0, values);
}
function scoreThree(cards: Card[]) {
  const values = cards.map((c) => rankValue(c.rank)).sort((a, b) => b - a),
    flush = cards.every((c) => c.suit === cards[0].suit),
    wheel = values.join(",") === "14,3,2",
    straight =
      new Set(values).size === 3 && (values[0] - values[2] === 2 || wheel),
    counts = values.map((v) => values.filter((x) => x === v).length);
  if (flush && straight) return pack(5, [wheel ? 3 : values[0]]);
  if (counts.includes(3)) return pack(4, [values[0]]);
  if (straight) return pack(3, [wheel ? 3 : values[0]]);
  if (flush) return pack(2, values);
  if (counts.includes(2)) {
    const pair = values.find(
      (v) => values.filter((x) => x === v).length === 2,
    )!;
    return pack(1, [pair, values.find((v) => v !== pair)!]);
  }
  return pack(0, values);
}
export function pokerScore(cards: Card[]): number {
  if (cards.length === 3) return scoreThree(cards);
  let best = 0;
  for (let a = 0; a < cards.length - 4; a++)
    for (let b = a + 1; b < cards.length - 3; b++)
      for (let c = b + 1; c < cards.length - 2; c++)
        for (let d = c + 1; d < cards.length - 1; d++)
          for (let e = d + 1; e < cards.length; e++)
            best = Math.max(
              best,
              scoreFive([cards[a], cards[b], cards[c], cards[d], cards[e]]),
            );
  return best;
}
