import { getPokerIdentity } from "../../chatgpt-auth";
import {
  roomServiceSecret,
  roomServiceUrl,
} from "../../../lib/multiplayer/runtime";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function roomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

export async function POST() {
  const identity = await getPokerIdentity();
  if (!identity)
    return Response.json({ error: "需要 Codex 插件账户" }, { status: 401 });
  const code = roomCode();
  const response = await fetch(`${roomServiceUrl()}/rooms/${code}/init`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Room-Service-Secret": roomServiceSecret(),
    },
    body: JSON.stringify({
      hostId: identity.userId,
      hostName: identity.displayName,
    }),
  });
  if (!response.ok)
    return Response.json({ error: "创建房间失败" }, { status: 502 });
  return Response.json({ code, url: `/room/${code}` });
}
