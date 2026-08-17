"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";

export function RoomsClient({ playerName }: { playerName: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    setBusy(true);
    setError("");
    const response = await fetch("/api/rooms", { method: "POST" });
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
        <p>首个联机玩法为三人斗地主。房间支持邀请、准备、断线重连和超时托管。</p>
      </section>
      <section className="rooms-actions">
        <div>
          <h2>创建私密房</h2>
          <p>你将成为房主。三名玩家准备后即可开始。</p>
          <button disabled={busy} onClick={create}>
            {busy ? "创建中…" : "创建斗地主房间"}
          </button>
        </div>
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
