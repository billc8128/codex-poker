import test from "node:test";
import assert from "node:assert/strict";
import {
  canBeatDoudizhu,
  classifyDoudizhu,
  generateDoudizhuPlays,
} from "../lib/games/doudizhu";
import {
  applyRoomCommand,
  createRoom,
  joinRoom,
  roomPlayerIdAtSeat,
  roomSettlements,
  roomSnapshot,
  setRoomPlayerConnected,
} from "../lib/multiplayer/room";
import { signRoomToken, verifyRoomToken } from "../lib/multiplayer/token";

function readyRoom() {
  let room = createRoom("ABC234", "p0", "Player 0");
  room = joinRoom(room, "p1", "Player 1");
  room = joinRoom(room, "p2", "Player 2");
  for (const id of ["p0", "p1", "p2"])
    room = applyRoomCommand(room, id, { type: "ready", ready: true });
  return room;
}

test("three players join, prepare, reconnect and start a private room", () => {
  let room = readyRoom();
  assert.equal(room.players.length, 3);
  room = setRoomPlayerConnected(room, "p1", false);
  assert.equal(room.players[1].connected, false);
  room = joinRoom(room, "p1", "Player 1");
  assert.equal(room.players[1].seat, 1);
  room = applyRoomCommand(room, "p0", { type: "start", seed: 115 });
  assert.equal(room.phase, "playing");
  assert.equal(room.game?.type, "doudizhu");
  assert.equal(room.game?.type === "doudizhu" && room.game.state.autoAi, false);
  assert.equal(
    room.game?.type === "doudizhu" &&
      room.game.state.hands.every((hand) => hand.length === 17),
    true,
  );
});

test("room snapshots expose only the requesting player's hand", () => {
  const room = applyRoomCommand(readyRoom(), "p0", {
    type: "start",
    seed: 115,
  });
  const snapshot = roomSnapshot(room, "p1");
  assert.equal(snapshot.game?.myHand.length, 17);
  assert.deepEqual(snapshot.game?.handCounts, [17, 17, 17]);
  assert.equal("hands" in snapshot.game!, false);
  assert.deepEqual(snapshot.game?.kitty, []);
});

test("three human seats can complete a full authoritative Doudizhu game", () => {
  let room = applyRoomCommand(readyRoom(), "p0", {
    type: "start",
    seed: 115,
  });
  let game = room.game?.type === "doudizhu" ? room.game.state : null;
  assert.ok(game);
  const bidder = roomPlayerIdAtSeat(room, game.currentPlayer)!;
  room = applyRoomCommand(room, bidder, { type: "bid", bid: 3 });
  let turns = 0;
  while (room.phase !== "done" && turns++ < 250) {
    game = room.game?.type === "doudizhu" ? room.game.state : null;
    assert.ok(game);
    const seat = game.currentPlayer;
    const playerId = roomPlayerIdAtSeat(room, seat)!;
    const legal = generateDoudizhuPlays(game.hands[seat])
      .filter((cards) =>
        canBeatDoudizhu(
          classifyDoudizhu(cards)!,
          game.target?.combo ?? null,
        ),
      )
      .sort((a, b) => b.length - a.length);
    room = legal.length
      ? applyRoomCommand(room, playerId, {
          type: "play",
          cardIds: legal[0].map((card) => card.id),
        })
      : applyRoomCommand(room, playerId, { type: "pass" });
  }
  assert.equal(room.phase, "done");
  const settlements = roomSettlements(room);
  assert.equal(settlements.length, 3);
  assert.equal(
    settlements.reduce((total, result) => total + result.delta, 0),
    0,
  );

  assert.throws(
    () => applyRoomCommand(room, "p0", { type: "start", seed: 116 }),
    /正在结算/,
  );
  room = applyRoomCommand(
    { ...room, settled: true },
    "p0",
    { type: "start", seed: 116 },
  );
  assert.equal(room.phase, "playing");
  assert.equal(room.gameNumber, 2);
  assert.deepEqual(
    room.players.map(({ id, seat, isBot }) => ({ id, seat, isBot })),
    [
      { id: "p0", seat: 0, isBot: false },
      { id: "p1", seat: 1, isBot: false },
      { id: "p2", seat: 2, isBot: false },
    ],
  );
});

test("room WebSocket tokens reject tampering", async () => {
  const secret = "room-token-test-secret";
  const token = await signRoomToken(secret, {
    room: "ABC234",
    playerId: "p0",
    name: "Player 0",
    exp: Math.floor(Date.now() / 1000) + 60,
  });
  assert.equal((await verifyRoomToken(secret, token))?.room, "ABC234");
  assert.equal(await verifyRoomToken(secret, `${token}x`), null);
});

function roomWithBots(
  gameType: "doudizhu" | "zhajinhua" | "holdem" | "blackjack",
  maxPlayers?: number,
) {
  let room = createRoom("BOT234", "human", "Human", gameType, maxPlayers);
  room = applyRoomCommand(room, "human", { type: "ready", ready: true });
  room = applyRoomCommand(room, "human", { type: "fill-bots" });
  return applyRoomCommand(room, "human", { type: "start", seed: 33 });
}

test("Doudizhu bots fill empty seats and automatically return control", () => {
  let room = roomWithBots("doudizhu");
  assert.equal(room.players.filter((player) => player.isBot).length, 2);
  let turns = 0;
  while (room.phase !== "done" && turns++ < 100) {
    const game = room.game?.type === "doudizhu" ? room.game.state : null;
    assert.ok(game);
    assert.equal(game.currentPlayer, 0);
    if (game.phase === "bidding") {
      room = applyRoomCommand(room, "human", { type: "bid", bid: 3 });
      continue;
    }
    const legal = generateDoudizhuPlays(game.hands[0])
      .filter((cards) =>
        canBeatDoudizhu(classifyDoudizhu(cards)!, game.target?.combo ?? null),
      )
      .sort((a, b) => b.length - a.length);
    room = legal.length
      ? applyRoomCommand(room, "human", {
          type: "play",
          cardIds: legal[0].map((card) => card.id),
        })
      : applyRoomCommand(room, "human", { type: "pass" });
  }
  assert.equal(room.phase, "done");
});

test("Zhajinhua room can finish with two AI seats", () => {
  let room = roomWithBots("zhajinhua");
  let turns = 0;
  while (room.phase !== "done" && turns++ < 20) {
    const game = room.game?.type === "zhajinhua" ? room.game.state : null;
    assert.ok(game);
    assert.equal(game.actor, 0);
    room =
      game.round >= 2
        ? applyRoomCommand(room, "human", {
            type: "zjh",
            action: "compare",
            value: game.active[1] ? 1 : 2,
          })
        : applyRoomCommand(room, "human", { type: "zjh", action: "call" });
  }
  assert.equal(room.phase, "done");
});

test("six-max Holdem room advances five strategy bots around the human", () => {
  let room = roomWithBots("holdem", 6);
  let turns = 0;
  while (room.phase !== "done" && turns++ < 30) {
    const game = room.game?.type === "holdem" ? room.game.state : null;
    assert.ok(game);
    assert.equal(game.actor, 0);
    const toCall = Math.max(0, game.currentBet - game.players[0].streetBet);
    room = applyRoomCommand(room, "human", {
      type: "holdem",
      action: toCall ? "call" : "check",
    });
  }
  assert.equal(room.phase, "done");
  assert.equal(
    room.game?.type === "holdem"
      ? room.game.state.players.reduce((sum, player) => sum + player.stack, 0)
      : 0,
    6000,
  );
});

test("multiplayer Blackjack resolves bots while the human controls their hand", () => {
  let room = roomWithBots("blackjack", 3);
  assert.equal(room.players.filter((player) => player.isBot).length, 2);
  const game = room.game?.type === "blackjack" ? room.game : null;
  assert.ok(game);
  assert.ok(
    room.players
      .filter((player) => player.isBot)
      .every((player) => game.states[player.seat].phase === "done"),
  );
  if (game.states[0].phase !== "done")
    room = applyRoomCommand(room, "human", {
      type: "blackjack",
      action: "stand",
    });
  assert.equal(room.phase, "done");
});
