import type { CSSProperties } from "react";

type CardLike = { rank: string; suit: string };

const figureByRank: Record<string, string> = {
  J: "/cards/jack.png",
  Q: "/cards/queen.png",
  K: "/cards/king.png",
  BJ: "/cards/joker-black.png",
  RJ: "/cards/joker-red.png",
};

const pipLayouts: Record<string, Array<[number, number, boolean?]>> = {
  A: [[50, 50]],
  "2": [[50, 24], [50, 76, true]],
  "3": [[50, 20], [50, 50], [50, 80, true]],
  "4": [[28, 24], [72, 24], [28, 76, true], [72, 76, true]],
  "5": [[28, 22], [72, 22], [50, 50], [28, 78, true], [72, 78, true]],
  "6": [[28, 20], [72, 20], [28, 50], [72, 50], [28, 80, true], [72, 80, true]],
  "7": [[28, 17], [72, 17], [50, 35], [28, 50], [72, 50], [28, 83, true], [72, 83, true]],
  "8": [[28, 15], [72, 15], [50, 34], [28, 50], [72, 50], [50, 66, true], [28, 85, true], [72, 85, true]],
  "9": [[28, 15], [72, 15], [28, 39], [72, 39], [50, 50], [28, 61, true], [72, 61, true], [28, 85, true], [72, 85, true]],
  "10": [[28, 12], [72, 12], [50, 29], [28, 35], [72, 35], [28, 65, true], [72, 65, true], [50, 71, true], [28, 88, true], [72, 88, true]],
};

export function cardDisplayName({ rank, suit }: CardLike) {
  if (rank === "BJ") return "小王";
  if (rank === "RJ") return "大王";
  return `${rank}${suit}`;
}

export function CardBackArt() {
  return <span aria-hidden="true" className="card-back-art" />;
}

export function CardArtwork({ rank, suit }: CardLike) {
  const red = suit === "♥" || suit === "♦" || rank === "RJ";
  const joker = rank === "BJ" || rank === "RJ";
  const figure = figureByRank[rank];
  const displayRank = joker ? "★" : rank;
  const displaySuit = joker ? "" : suit;

  return (
    <span className={`card-artwork ${red ? "is-red" : "is-black"}`}>
      <span className="card-corner card-corner-top" aria-hidden="true">
        <b>{displayRank}</b>
        {displaySuit && <i>{displaySuit}</i>}
      </span>
      <span className="card-corner card-corner-bottom" aria-hidden="true">
        <b>{displayRank}</b>
        {displaySuit && <i>{displaySuit}</i>}
      </span>
      {figure ? (
        <span
          aria-hidden="true"
          className={`card-figure ${joker ? "card-joker" : "card-royal"}`}
          style={{ "--card-figure": `url(${figure})` } as CSSProperties}
        />
      ) : (
        <span className="card-pips" aria-hidden="true">
          {(pipLayouts[rank] ?? [[50, 50]]).map(([x, y, inverted], index) => (
            <i
              className={inverted ? "is-inverted" : undefined}
              key={`${x}-${y}-${index}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {suit}
            </i>
          ))}
        </span>
      )}
    </span>
  );
}

