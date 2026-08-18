/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { getPokerIdentity } from "./chatgpt-auth";
import { accountFor } from "../lib/persistence/results";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Codex Poker",
  description: "Four compact card games for you and the machine.",
};

const games = [
  ["doudizhu", "斗地主", "Fight the Landlord", "3P"],
  ["zhajinhua", "扎金花", "Three Card Brag", "3P"],
  ["holdem", "德州扑克", "Six-max Texas Hold’em", "6P"],
  ["blackjack", "21点", "Blackjack", "1P"],
] as const;

export default async function Home() {
  const identity = await getPokerIdentity();
  const account = identity ? await accountFor(identity) : null;
  return (
    <main className="lobby-shell">
      <header className="topbar">
        <a className="wordmark" href="/">
          CODEX / POKER
        </a>
        <div className="account">
          {identity && <a href="/rooms">多人房</a>}
          <span className="status-dot" />
          {identity?.source === "chatgpt" ? (
            <>
              <a href="/account">{identity.displayName}</a>
              <a href="/signout-with-chatgpt?return_to=%2F">Sign out</a>
            </>
          ) : identity?.source === "plugin" ? (
            <>
              <a href="/account">{identity.displayName}</a>
              <span>Codex plugin</span>
            </>
          ) : identity?.source === "local" ? (
            <>
              <a href="/account">{identity.displayName}</a>
              <span>Local mode</span>
            </>
          ) : (
            <>
              <span>Guest</span>
              <a href="/signin-with-chatgpt?return_to=%2F">
                Sign in with ChatGPT
              </a>
            </>
          )}
        </div>
      </header>
      <section className="lobby-intro">
        <p className="eyebrow">NO-LIMIT INFERENCE · TABLE SELECT</p>
        <h1>
          Pick a table.
          <br />
          <span>Outthink the machine.</span>
        </h1>
        <div className="balance">
          <small>PLAY BALANCE</small>
          <strong>{(account?.balance ?? 10000).toLocaleString()}</strong>
          <span>Mtok</span>
        </div>
      </section>
      <section className="game-grid" aria-label="Game tables">
        {games.map(([slug, name, english, players], index) => (
          <a className={`game-card ${slug}`} href={`/play/${slug}`} key={slug}>
            <div className="card-top">
              <span>0{index + 1}</span>
              <span>{players} · AI TABLE</span>
            </div>
            <div className="suit-mark" aria-hidden="true">
              {["♠", "♦", "♣", "♥"][index]}
            </div>
            <h2>{name}</h2>
            <p>{english}</p>
            <div className="enter">
              Sit down <span>↗</span>
            </div>
          </a>
        ))}
      </section>
      <footer>Virtual points only · No purchase · No cash value</footer>
    </main>
  );
}
