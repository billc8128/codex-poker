import test from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken } from "../lib/auth/signed-token";

const secret = "codex-poker-test-secret-with-enough-entropy";

test("plugin launch tokens verify with the expected kind", async () => {
  const token = await signToken(secret, {
    sub: "account-1",
    kind: "launch",
    exp: Math.floor(Date.now() / 1000) + 60,
  });
  assert.equal((await verifyToken(secret, token, "launch"))?.sub, "account-1");
  assert.equal(await verifyToken(secret, token, "session"), null);
});

test("plugin tokens reject tampering and expiry", async () => {
  const expired = await signToken(secret, {
    sub: "account-1",
    kind: "session",
    exp: Math.floor(Date.now() / 1000) - 1,
  });
  assert.equal(await verifyToken(secret, expired, "session"), null);
  const active = await signToken(secret, {
    sub: "account-1",
    kind: "session",
    exp: Math.floor(Date.now() / 1000) + 60,
  });
  assert.equal(await verifyToken(secret, `${active}x`, "session"), null);
});
