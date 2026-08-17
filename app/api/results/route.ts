import { getPokerIdentity } from "../../chatgpt-auth";
import {
  accountFor,
  GameId,
  saveResult,
} from "../../../lib/persistence/results";

const games = new Set<GameId>([
  "doudizhu",
  "zhajinhua",
  "holdem",
  "blackjack",
]);

async function identity() {
  const value = await getPokerIdentity();
  if (!value) return null;
  return { userId: value.userId, displayName: value.displayName };
}

export async function GET() {
  const user = await identity();
  if (!user)
    return Response.json({ error: "Sign in with ChatGPT" }, { status: 401 });
  return Response.json(await accountFor(user));
}

export async function POST(request: Request) {
  const user = await identity();
  if (!user)
    return Response.json({ error: "Sign in with ChatGPT" }, { status: 401 });
  const body = (await request.json()) as {
    game: GameId;
    delta: number;
    roundId: string;
  };
  if (
    !games.has(body.game) ||
    !Number.isInteger(body.delta) ||
    Math.abs(body.delta) > 5000 ||
    typeof body.roundId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.roundId)
  )
    return Response.json({ error: "Invalid result" }, { status: 400 });
  return Response.json(
    await saveResult({
      ...user,
      roundId: body.roundId,
      game: body.game,
      delta: body.delta,
    }),
  );
}
