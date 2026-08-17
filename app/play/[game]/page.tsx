import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePokerIdentity } from "../../chatgpt-auth";
import { randomGameSeed } from "../../../lib/games/cards";
import { GameTable } from "./table";

const valid = ["doudizhu", "zhajinhua", "holdem", "blackjack"] as const;
const gameMetadata = {
  doudizhu: ["斗地主", "三人经典斗地主，对战本地策略 AI。"],
  zhajinhua: ["扎金花", "三人扎金花，对战本地策略 AI。"],
  holdem: ["六人德州扑克", "六人无限注德州，对战五种策略 AI。"],
  blackjack: ["21点", "六副牌 S17 规则 21 点。"],
} as const;
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game } = await params;
  if (!valid.includes(game as (typeof valid)[number])) return {};
  const [name, description] = gameMetadata[game as (typeof valid)[number]];
  const title = `${name} · Codex Poker`;
  return {
    title,
    description,
    openGraph: { title, description, images: [] },
    twitter: { title, description, images: [] },
  };
}
export default async function PlayPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  if (!valid.includes(game as (typeof valid)[number])) notFound();
  const identity = await requirePokerIdentity(`/play/${game}`);
  return (
    <GameTable
      game={game as (typeof valid)[number]}
      playerName={identity.displayName}
      initialSeed={randomGameSeed()}
      initialRoundId={crypto.randomUUID()}
    />
  );
}
