export type SignedTokenPayload = {
  sub: string;
  exp: number;
  kind: "launch" | "session";
};

const encoder = new TextEncoder();

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

export async function signToken(
  secret: string,
  payload: SignedTokenPayload,
) {
  const body = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret, ["sign"]),
    encoder.encode(body),
  );
  return `${body}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyToken(
  secret: string,
  token: string,
  expectedKind: SignedTokenPayload["kind"],
) {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret, ["verify"]),
      decodeBase64Url(signature),
      encoder.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(body)),
    ) as SignedTokenPayload;
    if (
      payload.kind !== expectedKind ||
      !payload.sub ||
      payload.exp <= Math.floor(Date.now() / 1000)
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}
