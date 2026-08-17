import { getPokerIdentity } from "../../../../chatgpt-auth";
import {
  roomServiceSecret,
  roomServiceUrl,
} from "../../../../../lib/multiplayer/runtime";
import { signRoomToken } from "../../../../../lib/multiplayer/token";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const identity = await getPokerIdentity();
  if (!identity)
    return Response.json({ error: "需要 Codex 插件账户" }, { status: 401 });
  const code = (await params).code.toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code))
    return Response.json({ error: "房间码无效" }, { status: 400 });
  const token = await signRoomToken(roomServiceSecret(), {
    room: code,
    playerId: identity.userId,
    name: identity.displayName,
    exp: Math.floor(Date.now() / 1000) + 60 * 5,
  });
  const websocketBase = roomServiceUrl().replace(/^http/, "ws");
  return Response.json({
    code,
    websocketUrl: `${websocketBase}/rooms/${code}/ws?token=${encodeURIComponent(token)}`,
  });
}
