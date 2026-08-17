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
  assert.equal(room.game?.autoAi, false);
  assert.equal(room.game?.hands.every((hand) => hand.length === 17), true);
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
  const bidder = roomPlayerIdAtSeat(room, room.game!.currentPlayer)!;
  room = applyRoomCommand(room, bidder, { type: "bid", bid: 3 });
  let turns = 0;
  while (room.phase !== "done" && turns++ < 250) {
    const game = room.game!;
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
