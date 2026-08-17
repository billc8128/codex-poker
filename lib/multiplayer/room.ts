import {
  blackjackValue,
  doubleBlackjack,
  hit,
  newBlackjack,
  splitBlackjack,
  stand,
  type BlackjackState,
} from "../games/blackjack";
import {
  bidDoudizhuPlayer,
  canBeatDoudizhu,
  classifyDoudizhu,
  generateDoudizhuPlays,
  legalDoudizhuSelectionForPlayer,
  newDoudizhu,
  passDoudizhuPlayer,
  playDoudizhuPlayer,
  type DdzState,
} from "../games/doudizhu";
import {
  actHoldemPlayer,
  chooseHoldemAiAction,
  newHoldem,
  type HoldemAction,
  type HoldemSeat,
  type HoldemState,
} from "../games/holdem";
import {
  callZhajinhuaPlayer,
  compareZhajinhuaPlayer,
  foldZhajinhuaPlayer,
  newZhajinhua,
  raiseZhajinhuaPlayer,
  seeZhajinhuaCards,
  type ZjhState,
} from "../games/zhajinhua";

export type RoomGameId = "doudizhu" | "zhajinhua" | "holdem" | "blackjack";
export type RoomPlayer = {
  id: string;
  name: string;
  seat: number;
  ready: boolean;
  connected: boolean;
  isBot: boolean;
};
type ActiveRoomGame =
  | { type: "doudizhu"; state: DdzState }
  | { type: "zhajinhua"; state: ZjhState }
  | { type: "holdem"; state: HoldemState }
  | { type: "blackjack"; states: Record<number, BlackjackState> };
export type RoomState = {
  code: string;
  hostId: string;
  gameType: RoomGameId;
  maxPlayers: number;
  phase: "lobby" | "playing" | "done";
  players: RoomPlayer[];
  game: ActiveRoomGame | null;
  gameNumber: number;
  version: number;
  turnDeadline: number | null;
  settled: boolean;
};
export type RoomCommand =
  | { type: "ready"; ready: boolean }
  | { type: "fill-bots" }
  | { type: "remove-bots" }
  | { type: "start"; seed: number }
  | { type: "bid"; bid: number }
  | { type: "play"; cardIds: string[] }
  | { type: "pass" }
  | { type: "zjh"; action: "see" | "call" | "fold" | "raise" | "compare"; value?: number }
  | { type: "holdem"; action: HoldemAction; target?: number }
  | { type: "blackjack"; action: "hit" | "stand" | "double" | "split" };

const TURN_MS = 45_000;
const config = {
  doudizhu: { min: 3, max: 3 },
  zhajinhua: { min: 3, max: 3 },
  holdem: { min: 3, max: 6 },
  blackjack: { min: 1, max: 5 },
} as const;

export function upgradeRoomState(raw: RoomState | Record<string, unknown>) {
  const state = raw as RoomState & { game?: ActiveRoomGame | DdzState | null };
  if (state.gameType) {
    return {
      ...state,
      players: state.players.map((player) => ({
        ...player,
        isBot: player.isBot ?? false,
      })),
    } satisfies RoomState;
  }
  const legacyGame = state.game as DdzState | null | undefined;
  return {
    ...state,
    gameType: "doudizhu",
    maxPlayers: 3,
    players: state.players.map((player) => ({ ...player, isBot: false })),
    game: legacyGame ? { type: "doudizhu", state: legacyGame } : null,
  } satisfies RoomState;
}

export function createRoom(
  code: string,
  hostId: string,
  hostName: string,
  gameType: RoomGameId = "doudizhu",
  requestedMax?: number,
) {
  const limits = config[gameType];
  const maxPlayers = Math.max(
    limits.min,
    Math.min(limits.max, requestedMax ?? limits.max),
  );
  return {
    code,
    hostId,
    gameType,
    maxPlayers,
    phase: "lobby",
    players: [
      {
        id: hostId,
        name: hostName,
        seat: 0,
        ready: false,
        connected: false,
        isBot: false,
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
  if (state.players.length >= state.maxPlayers) throw new Error("房间已满");
  const seat = firstOpenSeat(state);
  return {
    ...state,
    players: [
      ...state.players,
      { id, name, seat, ready: false, connected: true, isBot: false },
    ],
    version: state.version + 1,
  };
}

const firstOpenSeat = (state: RoomState) => {
  const used = new Set(state.players.map((player) => player.seat));
  for (let seat = 0; seat < state.maxPlayers; seat++)
    if (!used.has(seat)) return seat;
  throw new Error("没有可用座位");
};

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

const playerById = (state: RoomState, id: string) => {
  const player = state.players.find((candidate) => candidate.id === id);
  if (!player) throw new Error("你不在这个房间");
  return player;
};

const playerAtSeat = (state: RoomState, seat: number) =>
  state.players.find((player) => player.seat === seat);

function finishUpdate(state: RoomState, game: ActiveRoomGame) {
  const done = gameDone(game);
  return {
    ...state,
    game,
    phase: done ? ("done" as const) : ("playing" as const),
    turnDeadline: done ? null : Date.now() + TURN_MS,
    version: state.version + 1,
    settled: false,
  };
}

const gameDone = (game: ActiveRoomGame) => {
  if (game.type === "doudizhu") return game.state.phase === "done";
  if (game.type === "zhajinhua") return game.state.phase === "done";
  if (game.type === "holdem") return game.state.street === "done";
  return Object.values(game.states).every((state) => state.phase === "done");
};

function startGame(state: RoomState, seed: number): ActiveRoomGame {
  if (state.gameType === "doudizhu")
    return { type: "doudizhu", state: newDoudizhu(seed, false) };
  if (state.gameType === "zhajinhua")
    return { type: "zhajinhua", state: newZhajinhua(seed, false) };
  if (state.gameType === "holdem")
    return {
      type: "holdem",
      state: newHoldem(seed, 0, false, state.players.length),
    };
  return {
    type: "blackjack",
    states: Object.fromEntries(
      state.players.map((player) => [player.seat, newBlackjack(seed + player.seat * 97)]),
    ),
  };
}

export function applyRoomCommand(
  state: RoomState,
  playerId: string,
  command: RoomCommand,
) {
  const player = playerById(state, playerId);
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
  if (command.type === "fill-bots" || command.type === "remove-bots") {
    if (playerId !== state.hostId) throw new Error("只有房主可以管理 AI");
    if (state.phase !== "lobby") throw new Error("牌局已经开始");
    if (command.type === "remove-bots")
      return {
        ...state,
        players: state.players.filter((candidate) => !candidate.isBot),
        version: state.version + 1,
      };
    let next = state;
    while (next.players.length < next.maxPlayers) {
      const seat = firstOpenSeat(next);
      next = {
        ...next,
        players: [
          ...next.players,
          {
            id: `bot:${seat}`,
            name: `AI ${seat + 1}`,
            seat,
            ready: true,
            connected: true,
            isBot: true,
          },
        ],
      };
    }
    return { ...next, version: state.version + 1 };
  }
  if (command.type === "start") {
    if (playerId !== state.hostId) throw new Error("只有房主可以开始");
    if (state.phase !== "lobby") throw new Error("牌局已经开始");
    if (state.players.length < config[state.gameType].min)
      throw new Error(`至少需要 ${config[state.gameType].min} 名玩家或 AI`);
    if (state.players.some((candidate) => !candidate.ready))
      throw new Error("所有真人玩家准备后才能开始");
    return advanceBots({
      ...finishUpdate(state, startGame(state, command.seed)),
      gameNumber: state.gameNumber + 1,
    });
  }
  if (state.phase !== "playing" || !state.game)
    throw new Error("牌局还没有开始");
  const nextGame = applyPlayerGameCommand(state, player, command);
  return advanceBots(finishUpdate(state, nextGame));
}

function applyPlayerGameCommand(
  state: RoomState,
  player: RoomPlayer,
  command: RoomCommand,
): ActiveRoomGame {
  const game = state.game!;
  if (game.type === "doudizhu") {
    if (game.state.currentPlayer !== player.seat) throw new Error("还没轮到你");
    if (command.type === "bid") {
      const next = bidDoudizhuPlayer(game.state, player.seat as 0 | 1 | 2, command.bid);
      if (next.bids.length === game.state.bids.length) throw new Error(next.message);
      return { ...game, state: next };
    }
    if (command.type === "play") {
      const seat = player.seat as 0 | 1 | 2;
      const selection = legalDoudizhuSelectionForPlayer(
        game.state,
        seat,
        command.cardIds,
      );
      if (!selection.legal) throw new Error("所选牌型不合法或压不住桌面牌");
      return { ...game, state: playDoudizhuPlayer(game.state, seat, command.cardIds) };
    }
    if (command.type === "pass") {
      if (!game.state.target) throw new Error("首出不能过牌");
      return {
        ...game,
        state: passDoudizhuPlayer(game.state, player.seat as 0 | 1 | 2),
      };
    }
    throw new Error("当前操作不适用于斗地主");
  }
  if (game.type === "zhajinhua") {
    const seat = player.seat as 0 | 1 | 2;
    if (game.state.actor !== seat) throw new Error("还没轮到你");
    if (command.type !== "zjh") throw new Error("当前操作不适用于扎金花");
    if (command.action === "see") return { ...game, state: seeZhajinhuaCards(game.state, seat) };
    if (command.action === "call") return { ...game, state: callZhajinhuaPlayer(game.state, seat) };
    if (command.action === "fold") return { ...game, state: foldZhajinhuaPlayer(game.state, seat) };
    if (command.action === "raise")
      return { ...game, state: raiseZhajinhuaPlayer(game.state, seat, command.value as 20 | 40) };
    return {
      ...game,
      state: compareZhajinhuaPlayer(game.state, seat, Number(command.value)),
    };
  }
  if (game.type === "holdem") {
    const seat = player.seat as HoldemSeat;
    if (game.state.actor !== seat) throw new Error("还没轮到你");
    if (command.type !== "holdem") throw new Error("当前操作不适用于德州");
    return {
      ...game,
      state: actHoldemPlayer(game.state, seat, command.action, command.target),
    };
  }
  if (command.type !== "blackjack") throw new Error("当前操作不适用于 21 点");
  const current = game.states[player.seat];
  if (!current || current.phase === "done") throw new Error("你的牌局已经结束");
  const action = command.action;
  const next =
    action === "hit"
      ? hit(current)
      : action === "stand"
        ? stand(current)
        : action === "double"
          ? doubleBlackjack(current)
          : splitBlackjack(current);
  return { ...game, states: { ...game.states, [player.seat]: next } };
}

function advanceBots(state: RoomState) {
  if (!state.game) return state;
  let game = state.game;
  let guard = 0;
  while (!gameDone(game) && guard++ < 120) {
    if (game.type === "blackjack") {
      let changed = false;
      const states = { ...game.states };
      for (const player of state.players.filter((candidate) => candidate.isBot)) {
        let current = states[player.seat];
        while (current?.phase === "player")
          current = blackjackValue(current.hands[current.activeHand].cards) < 17
            ? hit(current)
            : stand(current);
        if (current && current !== states[player.seat]) {
          states[player.seat] = current;
          changed = true;
        }
      }
      game = { ...game, states };
      if (!changed) break;
      continue;
    }
    const seat =
      game.type === "doudizhu"
        ? game.state.currentPlayer
        : game.type === "zhajinhua"
          ? game.state.actor
          : game.state.actor;
    const bot = playerAtSeat(state, seat);
    if (!bot?.isBot) break;
    game = botMove(game, bot.seat);
  }
  return finishUpdate({ ...state, version: state.version - 1 }, game);
}

function botMove(game: ActiveRoomGame, seat: number): ActiveRoomGame {
  if (game.type === "doudizhu") {
    const player = seat as 0 | 1 | 2;
    if (game.state.phase === "bidding") {
      const hand = game.state.hands[player];
      const power = hand.filter((card) => ["2", "BJ", "RJ"].includes(card.rank)).length;
      const desired = power >= 4 ? 3 : power >= 2 ? 1 : 0;
      return {
        ...game,
        state: bidDoudizhuPlayer(
          game.state,
          player,
          desired > game.state.highestBid ? desired : 0,
        ),
      };
    }
    const legal = generateDoudizhuPlays(game.state.hands[player])
      .filter((cards) =>
        canBeatDoudizhu(
          classifyDoudizhu(cards)!,
          game.state.target?.combo ?? null,
        ),
      )
      .sort((a, b) => b.length - a.length);
    return {
      ...game,
      state: legal.length
        ? playDoudizhuPlayer(
            game.state,
            player,
            legal[0].map((card) => card.id),
          )
        : passDoudizhuPlayer(game.state, player),
    };
  }
  if (game.type === "zhajinhua") {
    const player = seat as 0 | 1 | 2;
    if (game.state.round >= 6) {
      const target = game.state.active.findIndex(
        (active, index) => active && index !== player,
      );
      return {
        ...game,
        state: compareZhajinhuaPlayer(game.state, player, target),
      };
    }
    return { ...game, state: callZhajinhuaPlayer(game.state, player) };
  }
  if (game.type === "holdem") {
    const player = seat as HoldemSeat;
    const decision = chooseHoldemAiAction(game.state, player);
    return {
      ...game,
      state: actHoldemPlayer(
        game.state,
        player,
        decision.action,
        decision.target,
      ),
    };
  }
  return game;
}

export function applyRoomTimeout(state: RoomState) {
  if (state.phase !== "playing" || !state.game) return state;
  const game = state.game;
  if (game.type === "doudizhu") {
    const seat = game.state.currentPlayer;
    const next =
      game.state.phase === "bidding"
        ? bidDoudizhuPlayer(game.state, seat, 0)
        : game.state.target
          ? passDoudizhuPlayer(game.state, seat)
          : playDoudizhuPlayer(game.state, seat, [game.state.hands[seat][0].id]);
    return advanceBots(finishUpdate(state, { ...game, state: next }));
  }
  if (game.type === "zhajinhua")
    return advanceBots(
      finishUpdate(state, {
        ...game,
        state: foldZhajinhuaPlayer(game.state, game.state.actor),
      }),
    );
  if (game.type === "holdem")
    return advanceBots(
      finishUpdate(state, {
        ...game,
        state: actHoldemPlayer(game.state, game.state.actor, "fold"),
      }),
    );
  const states = { ...game.states };
  for (const player of state.players)
    if (states[player.seat]?.phase === "player")
      states[player.seat] = stand(states[player.seat]);
  return finishUpdate(state, { ...game, states });
}

export function roomSnapshot(state: RoomState, playerId: string) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  return {
    code: state.code,
    gameType: state.gameType,
    maxPlayers: state.maxPlayers,
    phase: state.phase,
    hostId: state.hostId,
    me: player ? { id: player.id, seat: player.seat } : null,
    players: state.players,
    version: state.version,
    turnDeadline: state.turnDeadline,
    game: snapshotGame(state.game, player?.seat),
  };
}

function snapshotGame(game: ActiveRoomGame | null, seat?: number) {
  if (!game) return null;
  if (game.type === "doudizhu") {
    const state = game.state;
    return {
      type: game.type,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      bids: state.bids,
      highestBid: state.highestBid,
      highestBidder: state.highestBidder,
      landlord: state.landlord,
      multiplier: state.multiplier,
      target: state.target,
      actions: state.actions,
      message: state.message,
      winner: state.winner,
      handCounts: state.hands.map((hand) => hand.length),
      myHand: seat === undefined ? [] : state.hands[seat],
      kitty: state.phase === "bidding" ? [] : state.kitty,
    };
  }
  if (game.type === "zhajinhua") {
    const state = game.state;
    return {
      type: game.type,
      phase: state.phase,
      currentPlayer: state.actor,
      round: state.round,
      pot: state.pot,
      stake: state.stake,
      active: state.active,
      seen: state.seen,
      winner: state.winner,
      message: state.message,
      myHand: seat === undefined || (!state.seen[seat] && state.phase !== "done") ? [] : state.hands[seat],
      revealedHands: state.phase === "done" ? state.hands : null,
    };
  }
  if (game.type === "holdem") {
    const state = game.state;
    return {
      type: game.type,
      phase: state.street,
      currentPlayer: state.actor,
      board: state.board,
      pot: state.pot,
      currentBet: state.currentBet,
      minRaise: state.minRaise,
      dealer: state.dealer,
      smallBlind: state.smallBlind,
      bigBlind: state.bigBlind,
      players: state.players,
      actions: state.actions,
      winners: state.winners,
      message: state.message,
      myHand: seat === undefined ? [] : state.hands[seat],
      revealedHands:
        state.street === "done"
          ? state.hands.map((hand, index) =>
              state.players[index].folded ? [] : hand,
            )
          : null,
    };
  }
  return {
    type: game.type,
    phase: gameDone(game) ? "done" : "playing",
    currentPlayer: null,
    playerStates: Object.fromEntries(
      Object.entries(game.states).map(([playerSeat, state]) => [
        playerSeat,
        {
          phase: state.phase,
          result: state.result,
          delta: state.delta,
        },
      ]),
    ),
    myState: seat === undefined ? null : game.states[seat],
  };
}

export function roomSettlements(state: RoomState) {
  const game = state.game;
  if (!game || !gameDone(game)) return [];
  if (game.type === "doudizhu") {
    const landlordWon = game.state.winner === game.state.landlord;
    const stake = Math.max(1, game.state.highestBid) * game.state.multiplier;
    return state.players.filter((player) => !player.isBot).map((player) => ({
      userId: player.id,
      displayName: player.name,
      seat: player.seat,
      delta:
        player.seat === game.state.landlord
          ? landlordWon
            ? stake * 2
            : -stake * 2
          : landlordWon
            ? -stake
            : stake,
    }));
  }
  if (game.type === "zhajinhua")
    return state.players.filter((player) => !player.isBot).map((player) => ({
      userId: player.id,
      displayName: player.name,
      seat: player.seat,
      delta:
        player.seat === game.state.winner
          ? game.state.pot - game.state.contributions[player.seat]
          : -game.state.contributions[player.seat],
    }));
  if (game.type === "holdem")
    return state.players.filter((player) => !player.isBot).map((player) => ({
      userId: player.id,
      displayName: player.name,
      seat: player.seat,
      delta: game.state.players[player.seat].stack - 1000,
    }));
  return state.players.filter((player) => !player.isBot).map((player) => ({
    userId: player.id,
    displayName: player.name,
    seat: player.seat,
    delta: game.states[player.seat]?.delta ?? 0,
  }));
}

export function roomPlayerIdAtSeat(state: RoomState, seat: number) {
  return playerAtSeat(state, seat)?.id;
}
