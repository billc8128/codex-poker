/* eslint-disable @next/next/no-html-link-for-pages */
import { requirePokerIdentity } from "../chatgpt-auth";
import {
  accountFor,
  recentResultsFor,
} from "../../lib/persistence/results";

export const dynamic = "force-dynamic";

const gameNames = {
  doudizhu: "斗地主",
  zhajinhua: "扎金花",
  holdem: "德州扑克",
  blackjack: "21点",
} as const;

export default async function AccountPage() {
  const identity = await requirePokerIdentity("/account");
  const [account, results] = await Promise.all([
    accountFor(identity),
    recentResultsFor(identity.userId),
  ]);
  return (
    <main className="account-shell">
      <header className="account-nav">
        <a href="/">← 牌桌大厅</a>
        <a
          href={
            identity.source === "plugin"
              ? "/plugin-logout"
              : "/signout-with-chatgpt?return_to=%2F"
          }
        >
          退出账户
        </a>
      </header>
      <section className="account-summary">
        <div>
          <h1>{account.displayName}</h1>
          <p>
            {identity.source === "chatgpt"
              ? "ChatGPT 账户"
              : identity.source === "plugin"
                ? "Codex 插件账户"
                : "本地游客账户"}
          </p>
        </div>
        <div className="account-balance">
          <strong>{account.balance.toLocaleString()}</strong>
          <span>Mtok</span>
        </div>
      </section>
      <section className="account-history">
        <h2>最近牌局</h2>
        {results.length ? (
          <ol>
            {results.map((result) => (
              <li key={result.roundId ?? result.createdAt}>
                <strong>{gameNames[result.game]}</strong>
                <span>{new Date(result.createdAt).toLocaleString("zh-CN")}</span>
                <b className={result.delta >= 0 ? "gain" : "loss"}>
                  {result.delta > 0 ? "+" : ""}
                  {result.delta.toLocaleString()} Mtok
                </b>
              </li>
            ))}
          </ol>
        ) : (
          <p className="account-empty">完成第一局后，结算记录会出现在这里。</p>
        )}
      </section>
      <small className="account-disclaimer">
        Mtok 仅为游戏积分，不可购买、提现、转让或兑换现金。
      </small>
    </main>
  );
}
