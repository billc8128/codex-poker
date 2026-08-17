export type RoomTokenPayload = {
  room: string;
  playerId: string;
  name: string;
  exp: number;
};

const encoder = new TextEncoder();

function encode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function key(secret: string, usages: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

export async function signRoomToken(
  secret: string,
  payload: RoomTokenPayload,
) {
  const body = encode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await key(secret, ["sign"]),
    encoder.encode(body),
  );
  return `${body}.${encode(new Uint8Array(signature))}`;
}

export async function verifyRoomToken(secret: string, token: string) {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(secret, ["verify"]),
      decode(signature),
      encoder.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(decode(body)),
    ) as RoomTokenPayload;
    if (
      !payload.room ||
      !payload.playerId ||
      !payload.name ||
      payload.exp <= Math.floor(Date.now() / 1000)
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}
