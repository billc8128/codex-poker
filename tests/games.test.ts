import test from "node:test";
import assert from "node:assert/strict";
import { pokerScore, Rank, Suit } from "../lib/games/cards";
import {
  BlackjackState,
  blackjackValue,
  canSplitBlackjack,
  doubleBlackjack,
  newBlackjack,
  splitBlackjack,
  stand,
} from "../lib/games/blackjack";
import {
  bidDoudizhu,
  canBeatDoudizhu,
  chooseDoudizhuAiPlay,
  classifyDoudizhu,
  DdzCard,
  DdzRank,
  generateDoudizhuPlays,
  newDoudizhu,
  passDoudizhu,
  playDoudizhu,
  stepDoudizhuAi,
} from "../lib/games/doudizhu";
import {
  actHoldem,
  chooseHoldemAiAction,
  holdemToCall,
  HoldemSeat,
  newHoldem,
} from "../lib/games/holdem";
import {
  callZhajinhua,
  compareZhajinhua,
  compareZhajinhuaAction,
  foldZjh,
  newZhajinhua,
  rankZhajinhua,
  seeCards,
} from "../lib/games/zhajinhua";

const suits: Suit[] = ["♠", "♥", "♦", "♣"];
const hand = (ranks: Rank[], sameSuit = false) =>
  ranks.map((rank, i) => ({ rank, suit: sameSuit ? "♠" : suits[i % 4] }));
const ddz = (ranks: DdzRank[]) =>
  ranks.map(
    (rank, i) => ({ id: `${rank}-${i}`, rank, suit: suits[i % 4] }) as DdzCard,
  );

test("Texas evaluator orders every category correctly", () => {
  const scores = [
    hand(["A", "K", "Q", "J", "10"], true),
    hand(["9", "9", "9", "9", "2"]),
    hand(["8", "8", "8", "7", "7"]),
    hand(["A", "J", "8", "5", "2"], true),
    hand(["9", "8", "7", "6", "5"]),
    hand(["7", "7", "7", "K", "2"]),
    hand(["6", "6", "4", "4", "A"]),
    hand(["5", "5", "A", "9", "2"]),
    hand(["A", "J", "8", "5", "2"]),
  ].map(pokerScore);
  for (let i = 1; i < scores.length; i++)
    assert.ok(scores[i - 1] > scores[i], `${i - 1} should beat ${i}`);
});
test("Texas evaluator chooses best five of seven and handles wheel", () => {
  const seven = hand(["A", "2", "3", "4", "5", "K", "K"]);
  assert.ok(pokerScore(seven) > pokerScore(hand(["K", "K", "Q", "J", "9"])));
});

test("Zhajinhua category order and A23 low straight", () => {
  assert.equal(rankZhajinhua(hand(["A", "A", "A"])).category, "trips");
  assert.equal(
    rankZhajinhua(hand(["7", "6", "5"], true)).category,
    "straight-flush",
  );
  assert.equal(rankZhajinhua(hand(["A", "8", "3"], true)).category, "flush");
  assert.ok(compareZhajinhua(hand(["4", "3", "2"]), hand(["A", "3", "2"])) > 0);
});
test("Zhajinhua mixed 235 only beats trips", () => {
  const special = hand(["5", "3", "2"]),
    trips = hand(["A", "A", "A"]),
    pair = hand(["2", "2", "A"]);
  assert.equal(compareZhajinhua(special, trips), 1);
  assert.ok(compareZhajinhua(special, pair) < 0);
});
test("Zhajinhua completes through betting and compare", () => {
  let s = seeCards(newZhajinhua(12));
  s = callZhajinhua(s);
  assert.equal(s.pot, 70, "seen player pays 2x while blind AI pays 1x");
  assert.equal(s.actor, 0);
  s = compareZhajinhuaAction(s, 1);
  if (s.phase !== "done") s = compareZhajinhuaAction(s, 2);
  assert.equal(s.phase, "done");
  assert.equal(typeof s.delta, "number");
});
test("Zhajinhua completes the remaining AI duel after the player folds", () => {
  const s = foldZjh(newZhajinhua(12));
  assert.equal(s.phase, "done");
  assert.equal(s.active[0], false);
  assert.ok(s.winner === 1 || s.winner === 2);
  assert.equal(s.delta, -10);
  assert.match(s.result || "", /AI [12] 赢得底池/);
});

test("Doudizhu classifies the thirteen supported combination families", () => {
  const cases: [DdzRank[], string][] = [
    [["3"], "single"],
    [["4", "4"], "pair"],
    [["5", "5", "5"], "triple"],
    [["6", "6", "6", "9"], "triple-single"],
    [["7", "7", "7", "J", "J"], "triple-pair"],
    [["3", "4", "5", "6", "7"], "straight"],
    [["3", "3", "4", "4", "5", "5"], "pair-straight"],
    [["3", "3", "3", "4", "4", "4"], "airplane"],
    [["3", "3", "3", "4", "4", "4", "7", "8"], "airplane-singles"],
    [["3", "3", "3", "4", "4", "4", "7", "7", "8", "8"], "airplane-pairs"],
    [["9", "9", "9", "9"], "bomb"],
    [["BJ", "RJ"], "rocket"],
    [["10", "10", "10", "10", "3", "4"], "four-singles"],
    [["J", "J", "J", "J", "3", "3", "4", "4"], "four-pairs"],
  ];
  for (const [cards, type] of cases)
    assert.equal(classifyDoudizhu(ddz(cards))?.type, type, type);
});
test("Doudizhu rejects illegal chains and enforces bomb/rocket hierarchy", () => {
  assert.equal(classifyDoudizhu(ddz(["10", "J", "Q", "K", "A", "2"])), null);
  const straight = classifyDoudizhu(ddz(["3", "4", "5", "6", "7"]))!,
    bomb = classifyDoudizhu(ddz(["4", "4", "4", "4"]))!,
    rocket = classifyDoudizhu(ddz(["BJ", "RJ"]))!;
  assert.ok(canBeatDoudizhu(bomb, straight));
  assert.ok(canBeatDoudizhu(rocket, bomb));
  assert.ok(!canBeatDoudizhu(bomb, rocket));
  assert.ok(
    !canBeatDoudizhu(
      classifyDoudizhu(ddz(["A", "A"]))!,
      classifyDoudizhu(ddz(["3", "3", "3"]))!,
    ),
  );
});
test("Doudizhu deals 17/17/17 plus kitty, bids, and completes a full game", () => {
  let s = newDoudizhu(115);
  assert.deepEqual(
    s.hands.map((h) => h.length),
    [17, 17, 17],
  );
  assert.equal(s.kitty.length, 3);
  assert.equal(s.firstBidder, 0);
  s = bidDoudizhu(s, 3);
  assert.equal(s.phase, "playing");
  assert.equal(s.landlord, 0);
  assert.equal(s.hands[0].length, 20);
  let turns = 0;
  while (s.phase !== "done" && turns++ < 200) {
    if (s.currentPlayer !== 0) throw new Error("AI loop should return control");
    const legal = generateDoudizhuPlays(s.hands[0])
      .filter((cards) =>
        canBeatDoudizhu(classifyDoudizhu(cards)!, s.target?.combo || null),
      )
      .sort((a, b) => b.length - a.length);
    s = legal.length
      ? playDoudizhu(
          s,
          legal[0].map((c) => c.id),
        )
      : passDoudizhu(s);
  }
  assert.equal(s.phase, "done");
  assert.equal(typeof s.delta, "number");
  assert.match(s.message, /^(你|AI [12])率先出完 · (地主|农民)获胜$/);
});
test("Doudizhu explains a second user pass and then starts with the AI landlord", () => {
  let s = newDoudizhu(1);
  assert.equal(s.firstBidder, 0);
  assert.deepEqual(s.bids, []);
  s = bidDoudizhu(s, 0);
  assert.equal(s.phase, "bidding");
  assert.equal(s.currentPlayer, 0);
  assert.equal(s.highestBid, 2);
  assert.equal(s.highestBidder, 1);
  assert.deepEqual(s.bids, [
    { player: 0, bid: 0 },
    { player: 1, bid: 2 },
    { player: 2, bid: 0 },
  ]);
  assert.equal(s.message, "放弃竞叫后，AI 1 成为地主并开始出牌。");
  s = bidDoudizhu(s, 0);
  assert.equal(s.phase, "playing");
  assert.equal(s.landlord, 1);
});
test("Doudizhu rotates the first bidder across deterministic deals", () => {
  assert.equal(newDoudizhu(113).firstBidder, 2);
  assert.equal(newDoudizhu(114).firstBidder, 1);
  assert.equal(newDoudizhu(115).firstBidder, 0);
});
test("Doudizhu advances one AI action at a time for visible turn feedback", () => {
  let s = bidDoudizhu(newDoudizhu(113), 3);
  s = playDoudizhu(
    s,
    s.hands[0].slice(0, 8).map((card) => card.id),
    false,
  );
  assert.equal(s.currentPlayer, 1);
  assert.equal(s.actions.length, 1);
  s = stepDoudizhuAi(s);
  assert.equal(s.currentPlayer, 2);
  assert.equal(s.actions.length, 2);
  assert.equal(s.actions.at(-1)?.kind, "pass");
  assert.equal(s.message, "AI 1过牌");
  s = stepDoudizhuAi(s);
  assert.equal(s.currentPlayer, 0);
  assert.equal(s.actions.length, 3);
  assert.equal(s.message, "AI 2过牌。两家都过牌，你重新首出。");
});
test("Doudizhu AI leads a hand-shaping combination instead of the smallest single", () => {
  let s = newDoudizhu(113);
  s = bidDoudizhu(s, 0);
  assert.equal(s.phase, "playing");
  assert.equal(s.currentPlayer, 2);
  const choice = chooseDoudizhuAiPlay(s);
  assert.ok(choice);
  assert.equal(classifyDoudizhu(choice!)?.type, "triple-pair");
  assert.ok(choice!.length > 1);
});
test("Doudizhu farmer AI does not overtake its farmer teammate", () => {
  const base = bidDoudizhu(newDoudizhu(115), 3);
  const teammateCard = base.hands[1][0];
  const state = {
    ...base,
    currentPlayer: 2 as const,
    landlord: 0,
    target: {
      player: 1,
      cards: [teammateCard],
      combo: classifyDoudizhu([teammateCard])!,
    },
    lastPlayer: 1,
  };
  assert.equal(chooseDoudizhuAiPlay(state), null);
});

test("Blackjack values multiple aces correctly", () => {
  assert.equal(blackjackValue(hand(["A", "A", "9"])), 21);
  assert.equal(blackjackValue(hand(["A", "A", "A", "9"])), 12);
});
test("Blackjack completes dealer play after stand", () => {
  let s = newBlackjack(11);
  if (s.phase === "done") s = newBlackjack(12);
  while (s.phase === "player") s = stand(s);
  assert.equal(s.phase, "done");
  assert.equal(typeof s.delta, "number");
});
test("Blackjack dealer stands on soft 17", () => {
  const state: BlackjackState = {
    phase: "player",
    hands: [
      {
        cards: hand(["10", "8"]),
        bet: 100,
        status: "active",
        splitAces: false,
      },
    ],
    activeHand: 0,
    dealer: hand(["A", "6"]),
    shoe: hand(["K"]),
    splitUsed: false,
  };
  const done = stand(state);
  assert.equal(done.dealer.length, 2);
  assert.equal(done.phase, "done");
});
test("Blackjack natural pays 3:2", () => {
  let found;
  for (let seed = 1; seed < 2000 && !found; seed++) {
    const state = newBlackjack(seed);
    if (state.phase === "done" && state.delta === 150) found = state;
  }
  assert.ok(found, "expected a deterministic player natural seed");
});
test("Blackjack double draws exactly one card and doubles wager", () => {
  let s = newBlackjack(21);
  while (s.phase === "done") s = newBlackjack(++s.activeHand + 22);
  const before = s.hands[0].cards.length;
  s = doubleBlackjack(s);
  assert.equal(s.hands[0].cards.length, before + 1);
  assert.equal(s.hands[0].bet, 200);
});
test("Blackjack split creates two hands when a splittable seed is found", () => {
  let s = newBlackjack(1),
    seed = 1;
  while (!canSplitBlackjack(s) && seed < 500) s = newBlackjack(++seed);
  assert.ok(canSplitBlackjack(s));
  s = splitBlackjack(s);
  assert.equal(s.hands.length, 2);
  assert.equal(s.splitUsed, true);
});

test("Six-max Holdem deals six hands, posts blinds, and forbids facing-bet checks", () => {
  const s = newHoldem(3);
  assert.equal(s.hands.length, 6);
  assert.ok(s.hands.every((cards) => cards.length === 2));
  assert.equal(s.dealer, 3);
  assert.equal(s.players[4].streetBet, 10);
  assert.equal(s.players[5].streetBet, 20);
  assert.equal(s.actor, 0);
  assert.equal(holdemToCall(s), 20);
  const invalid = actHoldem(s, "check");
  assert.equal(invalid.street, "preflop");
  assert.match(invalid.message, /不能过牌/);
});
test("Six-max Holdem finishes the AI table and names winners after the player folds", () => {
  const s = actHoldem(newHoldem(5), "fold");
  assert.equal(s.street, "done");
  assert.match(s.result || "", /AI [1-5]赢得/);
  assert.ok((s.delta || 0) < 0);
  assert.equal(
    s.players.reduce((total, player) => total + player.stack, 0),
    6000,
  );
});
test("Six-max Holdem completes all betting streets and conserves all chips", () => {
  let s = newHoldem(33),
    guard = 0;
  while (s.street !== "done" && guard++ < 30)
    s = actHoldem(s, holdemToCall(s) ? "call" : "check");
  assert.equal(s.street, "done");
  assert.equal(s.board.length, 5);
  assert.equal(typeof s.delta, "number");
  assert.equal(
    s.players.reduce((total, player) => total + player.stack, 0),
    6000,
  );
  assert.match(s.result || "", /(你|AI [1-5])赢得/);
});
test("Six-max Holdem records a legal minimum preflop raise to 40", () => {
  const s = actHoldem(newHoldem(3), "raise", 40);
  const heroRaise = s.actions.find(
    (action) => action.player === 0 && action.action === "raise",
  );
  assert.equal(heroRaise?.amount, 40);
});
test("Holdem AI folds weak hands under pressure and attacks with premium hands", () => {
  const base = newHoldem(3);
  const pressured = {
    ...base,
    actor: 1 as HoldemSeat,
    currentBet: 300,
    pot: 90,
    hands: base.hands.map((cards, player) =>
      player === 1 ? hand(["7", "2"]) : cards,
    ) as typeof base.hands,
  };
  assert.equal(chooseHoldemAiAction(pressured, 1).action, "fold");
  const premium = {
    ...base,
    actor: 2 as HoldemSeat,
    hands: base.hands.map((cards, player) =>
      player === 2 ? hand(["A", "A"]) : cards,
    ) as typeof base.hands,
  };
  const decision = chooseHoldemAiAction(premium, 2);
  assert.ok(decision.action === "raise" || decision.action === "allin");
  assert.match(decision.reason, /牌力领先/);
});
