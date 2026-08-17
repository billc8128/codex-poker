"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DdzAction, DdzBid, DdzCard, DdzPlay } from "../../../lib/games/doudizhu";

type Player = {
  id: string;
  name: string;
  seat: 0 | 1 | 2;
  ready: boolean;
  connected: boolean;
};
type Snapshot = {
  code: string;
  phase: "lobby" | "playing" | "done";
  hostId: string;
  me: { id: string; seat: 0 | 1 | 2 } | null;
  players: Player[];
  version: number;
  turnDeadline: number | null;
  game: null | {
    phase: "bidding" | "playing" | "done";
    currentPlayer: 0 | 1 | 2;
    firstBidder: 0 | 1 | 2;
    bids: DdzBid[];
    highestBid: number;
    highestBidder: number | null;
    landlord: number | null;
    multiplier: number;
    target: DdzPlay | null;
    actions: DdzAction[];
    message: string;
    winner?: number;
    handCounts: number[];
    myHand: DdzCard[];
    kitty: DdzCard[];
  };
};

const cardName = (card: DdzCard) =>
  card.rank === "BJ" ? "小王" : card.rank === "RJ" ? "大王" : card.rank;

export function MultiplayerDoudizhu({
  code,
  playerName,
}: {
  code: string;
  playerName: string;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState("连接房间中…");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [connection, setConnection] = useState<WebSocket | null>(null);

  useEffect(() => {
    let active = true;
    let currentSocket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    const open = async () => {
      const response = await fetch(`/api/rooms/${code}/token`);
      const body = (await response.json()) as {
        websocketUrl?: string;
        error?: string;
      };
      if (!active) return;
      if (!body.websocketUrl) {
        setError(body.error ?? "无法加入房间");
        return;
      }
      const ws = new WebSocket(body.websocketUrl);
      currentSocket = ws;
      setConnection(ws);
      ws.onopen = () => setStatus("已连接");
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as {
          type: "snapshot" | "error";
          data?: Snapshot;
          message?: string;
        };
        if (message.type === "snapshot" && message.data) {
          setSnapshot(message.data);
          setSelected([]);
          setError("");
        } else if (message.message) setError(message.message);
      };
      ws.onclose = () => {
        if (!active) return;
        setConnection(null);
        setStatus("连接中断，正在重连…");
        reconnectTimer = window.setTimeout(open, 1200);
      };
    };
    void open();
    return () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      currentSocket?.close();
    };
  }, [code]);

  const send = useCallback(
    (message: object) => {
      if (connection?.readyState === WebSocket.OPEN)
        connection.send(JSON.stringify(message));
    },
    [connection],
  );
  const me = snapshot?.me;
  const myPlayer = snapshot?.players.find((player) => player.id === me?.id);
  const isHost = snapshot?.hostId === me?.id;
  const myTurn = Boolean(
    snapshot?.game && me && snapshot.game.currentPlayer === me.seat,
  );
  const playerAt = (seat: number) =>
    snapshot?.players.find((player) => player.seat === seat);
  const turnName = snapshot?.game
    ? playerAt(snapshot.game.currentPlayer)?.name ?? `座位 ${snapshot.game.currentPlayer + 1}`
    : "";
  const inviteUrl = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/room/${code}`),
    [code],
  );

  return (
    <main className="room-shell">
      <header className="room-nav">
        <a href="/rooms">← 多人房</a>
        <strong>房间 {code}</strong>
        <span>{playerName} · {status}</span>
      </header>
      <section className="room-toolbar">
        <div>
          <h1>三人斗地主</h1>
          <p>{snapshot?.phase === "lobby" ? "等待玩家准备" : `轮到 ${turnName}`}</p>
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(inviteUrl);
            setStatus("邀请链接已复制");
          }}
        >
          复制邀请链接
        </button>
      </section>
      <section className="room-table">
        <div className="room-seats">
          {[0, 1, 2].map((seat) => {
            const player = playerAt(seat);
            return (
              <div
                className={`room-seat ${snapshot?.game?.currentPlayer === seat ? "turn" : ""}`}
                key={seat}
              >
                <b>{player?.name ?? "等待加入"}</b>
                <span>
                  {player
                    ? `${player.connected ? "在线" : "断线"} · ${player.ready ? "已准备" : "未准备"}`
                    : `座位 ${seat + 1}`}
                </span>
                {snapshot?.game && (
                  <strong>
                    {snapshot.game.landlord === seat ? "地主" : "农民"} · {snapshot.game.handCounts[seat]} 张
                  </strong>
                )}
              </div>
            );
          })}
        </div>

        {snapshot?.phase === "lobby" && (
          <div className="room-lobby-state">
            <strong>{snapshot.players.length} / 3</strong>
            <span>三名玩家准备后由房主开始</span>
          </div>
        )}

        {snapshot?.game && (
          <>
            <div className="room-game-meta">
              <span>×{snapshot.game.multiplier}</span>
              <strong>
                {snapshot.game.phase === "bidding"
                  ? `当前叫分 ${snapshot.game.highestBid}`
                  : snapshot.game.target
                    ? `${playerAt(snapshot.game.target.player)?.name ?? "玩家"} 的牌`
                    : "新一墩"}
              </strong>
            </div>
            <div className="room-winning-cards">
              {snapshot.game.target?.cards.map((card) => (
                <span key={card.id}>{cardName(card)}</span>
              ))}
            </div>
            <div className="room-bid-history">
              {snapshot.game.bids.map((bid, index) => (
                <span key={`${bid.player}-${index}`}>
                  {playerAt(bid.player)?.name}：{bid.bid ? `${bid.bid} 分` : "不叫"}
                </span>
              ))}
            </div>
            <div className="room-my-hand" aria-label="我的手牌">
              {snapshot.game.myHand.map((card) => (
                <button
                  aria-pressed={selected.includes(card.id)}
                  className={selected.includes(card.id) ? "selected" : ""}
                  disabled={!myTurn || snapshot.game?.phase !== "playing"}
                  key={card.id}
                  onClick={() =>
                    setSelected((current) =>
                      current.includes(card.id)
                        ? current.filter((id) => id !== card.id)
                        : [...current, card.id],
                    )
                  }
                >
                  {cardName(card)}
                  <small>{card.suit}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
      <section className="room-controls">
        {snapshot?.phase === "lobby" && myPlayer && (
          <button onClick={() => send({ type: "ready", ready: !myPlayer.ready })}>
            {myPlayer.ready ? "取消准备" : "准备"}
          </button>
        )}
        {snapshot?.phase === "lobby" && isHost && (
          <button
            className="primary"
            disabled={snapshot.players.length !== 3 || snapshot.players.some((player) => !player.ready)}
            onClick={() => send({ type: "start", seed: crypto.getRandomValues(new Uint32Array(1))[0] })}
          >
            开始游戏
          </button>
        )}
        {snapshot?.game?.phase === "bidding" && myTurn &&
          [0, 1, 2, 3].map((bid) => (
            <button
              disabled={bid > 0 && bid <= snapshot.game!.highestBid}
              key={bid}
              onClick={() => send({ type: "bid", bid })}
            >
              {bid ? `叫 ${bid} 分` : "不叫"}
            </button>
          ))}
        {snapshot?.game?.phase === "playing" && myTurn && (
          <>
            <button
              disabled={!snapshot.game.target}
              onClick={() => send({ type: "pass" })}
            >
              过牌
            </button>
            <button
              className="primary"
              disabled={!selected.length}
              onClick={() => send({ type: "play", cardIds: selected })}
            >
              出牌
            </button>
          </>
        )}
        {snapshot?.phase === "done" && (
          <strong>
            {playerAt(snapshot.game?.winner ?? -1)?.name ?? "玩家"} 获胜
          </strong>
        )}
      </section>
      {error && <p className="room-error">{error}</p>}
      <small className="room-footnote">
        断线后座位会保留；每回合 45 秒，超时自动不叫、过牌或出最小单张。
      </small>
    </main>
  );
}
