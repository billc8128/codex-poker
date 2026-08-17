import { saveResult } from "../../../lib/persistence/results";
import { roomServiceSecret } from "../../../lib/multiplayer/runtime";

type RoomResult = {
  userId: string;
  displayName: string;
  seat: number;
  delta: number;
};

export async function POST(request: Request) {
  if (request.headers.get("X-Room-Service-Secret") !== roomServiceSecret())
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as {
    roomId: string;
    gameType: "doudizhu" | "zhajinhua" | "holdem" | "blackjack";
    gameNumber: number;
    results: RoomResult[];
  };
  if (!/^[A-Z2-9]{6}$/.test(body.roomId) || !Number.isInteger(body.gameNumber))
    return Response.json({ error: "Invalid settlement" }, { status: 400 });
  await Promise.all(
    body.results.map((result) =>
      saveResult({
        userId: result.userId,
        displayName: result.displayName,
        roundId: `room-${body.roomId}-${body.gameNumber}-${result.seat}`,
        game: body.gameType,
        delta: result.delta,
      }),
    ),
  );
  return Response.json({ ok: true });
}
