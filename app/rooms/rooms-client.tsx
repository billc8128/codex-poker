"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";

export function RoomsClient({ playerName }: { playerName: string }) {
  const [code, setCode] = useState("");
  const [gameType, setGameType] = useState("doudizhu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const selectedGame = String(form.get("gameType") ?? "doudizhu");
    const selectedMax =
      selectedGame === "holdem" ? 6 : selectedGame === "blackjack" ? 5 : 3;
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        gameType: selectedGame,
        maxPlayers:
          selectedGame === "holdem" || selectedGame === "blackjack"
            ? selectedMax
            : 3,
      }),
    });
    const body = (await response.json()) as { url?: string; error?: string };
    if (body.url) window.location.href = body.url;
    else {
      setError(body.error ?? "创建房间失败");
      setBusy(false);
    }
  };

  const join = (event: FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(normalized)) {
      setError("请输入 6 位房间码");
      return;
    }
    window.location.href = `/room/${normalized}`;
  };

  return (
    <main className="rooms-shell">
      <header className="rooms-nav">
        <a href="/">← 牌桌大厅</a>
        <span>{playerName}</span>
      </header>
      <section className="rooms-hero">
        <h1>和朋友开一桌。</h1>
        <p>选择玩法和人数。人不够时，房主可以在房间里一键用策略 AI 补齐空位。</p>
      </section>
      <section className="rooms-actions">
        <form onSubmit={create}>
          <h2>创建私密房</h2>
          <p>你将成为房主，可邀请真人、调整人数或让 AI 补位。</p>
          <label>
            玩法
            <select
              name="gameType"
              onChange={(event) => {
                const value = event.target.value;
                setGameType(value);
              }}
              value={gameType}
            >
              <option value="doudizhu">斗地主 · 3 人</option>
              <option value="zhajinhua">扎金花 · 3 人</option>
              <option value="holdem">德州扑克 · 3–6 人</option>
              <option value="blackjack">21 点 · 1–5 人</option>
            </select>
          </label>
          <button disabled={busy} type="submit">
            {busy ? "创建中…" : "创建房间"}
          </button>
        </form>
        <form onSubmit={join}>
          <h2>加入房间</h2>
          <p>输入朋友发来的六位房间码。</p>
          <label>
            房间码
            <input
              autoCapitalize="characters"
              maxLength={6}
              onChange={(event) => setCode(event.target.value)}
              placeholder="K7P4QX"
              value={code}
            />
          </label>
          <button type="submit">加入房间</button>
        </form>
      </section>
      {error && <p className="rooms-error">{error}</p>}
      <small>Mtok 仅为虚拟积分，不可充值、提现或兑换现金。</small>
    </main>
  );
}
