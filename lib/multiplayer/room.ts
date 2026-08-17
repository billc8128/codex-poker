import {
  bidDoudizhuPlayer,
  DdzState,
  legalDoudizhuSelectionForPlayer,
  newDoudizhu,
  passDoudizhuPlayer,
  playDoudizhuPlayer,
} from "../games/doudizhu";

export type RoomSeat = 0 | 1 | 2;
export type RoomPlayer = {
  id: string;
  name: string;
  seat: RoomSeat;
  ready: boolean;
  connected: boolean;
};
export type RoomState = {
  code: string;
  hostId: string;
  phase: "lobby" | "playing" | "done";
  players: RoomPlayer[];
  game: DdzState | null;
  gameNumber: number;
  version: number;
  turnDeadline: number | null;
  settled: boolean;
};
export type RoomCommand =
  | { type: "ready"; ready: boolean }
  | { type: "start"; seed: number }
  | { type: "bid"; bid: number }
  | { type: "play"; cardIds: string[] }
  | { type: "pass" };

const TURN_MS = 45_000;
const asSeat = (value: number) => value as RoomSeat;

export function createRoom(code: string, hostId: string, hostName: string) {
  return {
    code,
    hostId,
    phase: "lobby",
    players: [
      {
        id: hostId,
        name: hostName,
        seat: 0 as const,
        ready: false,
        connected: false,
      },
    ],
    game: null,
    gameNumber: 0,
    version: 1,
    turnDeadline: null,
    settled: false,
  } satisfies RoomState;
}

export function joinRoom(state: RoomState, id: string, name: string) {
  const existing = state.players.find((player) => player.id === id);
  if (existing)
    return {
      ...state,
      players: state.players.map((player) =>
        player.id === id ? { ...player, connected: true, name } : player,
      ),
      version: state.version + 1,
    };
  if (state.phase !== "lobby") throw new Error("牌局已经开始");
  if (state.players.length >= 3) throw new Error("房间已满");
  const used = new Set(state.players.map((player) => player.seat));
  const seat = ([0, 1, 2] as RoomSeat[]).find((value) => !used.has(value));
  if (seat === undefined) throw new Error("没有可用座位");
  return {
    ...state,
    players: [
      ...state.players,
      { id, name, seat, ready: false, connected: true },
    ],
    version: state.version + 1,
  };
}

export function setRoomPlayerConnected(
  state: RoomState,
  id: string,
  connected: boolean,
) {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === id ? { ...player, connected } : player,
    ),
    version: state.version + 1,
  };
}

function roomPlayer(state: RoomState, id: string) {
  const player = state.players.find((candidate) => candidate.id === id);
  if (!player) throw new Error("你不在这个房间");
  return player;
}

function advanceGame(state: RoomState, game: DdzState) {
  return {
    ...state,
    game,
    phase: game.phase === "done" ? ("done" as const) : ("playing" as const),
    turnDeadline: game.phase === "done" ? null : Date.now() + TURN_MS,
    version: state.version + 1,
    settled: false,
  };
}

export function applyRoomCommand(
  state: RoomState,
  playerId: string,
  command: RoomCommand,
) {
  const player = roomPlayer(state, playerId);
  if (command.type === "ready") {
    if (state.phase !== "lobby") throw new Error("牌局已经开始");
    return {
      ...state,
      players: state.players.map((candidate) =>
        candidate.id === playerId
          ? { ...candidate, ready: command.ready }
          : candidate,
      ),
      version: state.version + 1,
    };
  }
  if (command.type === "start") {
    if (playerId !== state.hostId) throw new Error("只有房主可以开始");
    if (state.phase !== "lobby") throw new Error("牌局已经开始");
    if (state.players.length !== 3) throw new Error("斗地主需要 3 名玩家");
    if (state.players.some((candidate) => !candidate.ready))
      throw new Error("所有玩家准备后才能开始");
    return {
      ...advanceGame(state, newDoudizhu(command.seed, false)),
      gameNumber: state.gameNumber + 1,
    };
  }
  if (state.phase !== "playing" || !state.game)
    throw new Error("牌局还没有开始");
  if (state.game.currentPlayer !== player.seat) throw new Error("还没轮到你");
  if (command.type === "bid") {
    const game = bidDoudizhuPlayer(state.game, player.seat, command.bid);
    if (game.bids.length === state.game.bids.length) throw new Error(game.message);
    return advanceGame(state, game);
  }
  if (command.type === "play") {
    const selection = legalDoudizhuSelectionForPlayer(
      state.game,
      player.seat,
      command.cardIds,
    );
    if (!selection.legal) throw new Error("所选牌型不合法或压不住桌面牌");
    return advanceGame(
      state,
      playDoudizhuPlayer(state.game, player.seat, command.cardIds),
    );
  }
  if (!state.game.target) throw new Error("首出不能过牌");
  return advanceGame(state, passDoudizhuPlayer(state.game, player.seat));
}

export function applyRoomTimeout(state: RoomState) {
  if (state.phase !== "playing" || !state.game) return state;
  const seat = state.game.currentPlayer;
  if (state.game.phase === "bidding")
    return advanceGame(state, bidDoudizhuPlayer(state.game, seat, 0));
  if (state.game.target)
    return advanceGame(state, passDoudizhuPlayer(state.game, seat));
  const card = state.game.hands[seat][0];
  return advanceGame(
    state,
    playDoudizhuPlayer(state.game, seat, [card.id]),
  );
}

export function roomSnapshot(state: RoomState, playerId: string) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const game = state.game;
  return {
    code: state.code,
    phase: state.phase,
    hostId: state.hostId,
    me: player ? { id: player.id, seat: player.seat } : null,
    players: state.players.map(({ id, name, seat, ready, connected }) => ({
      id,
      name,
      seat,
      ready,
      connected,
    })),
    version: state.version,
    turnDeadline: state.turnDeadline,
    game: game
      ? {
          phase: game.phase,
          currentPlayer: game.currentPlayer,
          firstBidder: game.firstBidder,
          bids: game.bids,
          highestBid: game.highestBid,
          highestBidder: game.highestBidder,
          landlord: game.landlord,
          multiplier: game.multiplier,
          target: game.target,
          actions: game.actions,
          message: game.message,
          winner: game.winner,
          handCounts: game.hands.map((hand) => hand.length),
          myHand: player ? game.hands[player.seat] : [],
          kitty: game.phase === "bidding" ? [] : game.kitty,
        }
      : null,
  };
}

export function roomSettlements(state: RoomState) {
  const game = state.game;
  if (!game || game.phase !== "done" || game.winner === undefined) return [];
  const landlordWon = game.winner === game.landlord;
  const stake = Math.max(1, game.highestBid) * game.multiplier;
  return state.players.map((player) => ({
    userId: player.id,
    displayName: player.name,
    seat: player.seat,
    delta:
      player.seat === game.landlord
        ? landlordWon
          ? stake * 2
          : -stake * 2
        : landlordWon
          ? -stake
          : stake,
  }));
}

export function roomPlayerIdAtSeat(state: RoomState, seat: number) {
  return state.players.find((player) => player.seat === asSeat(seat))?.id;
}
