import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const port = 3199;
const base = `http://localhost:${port}`;
let preview;
let output = "";

before(async () => {
  preview = spawn(
    new URL("../node_modules/.bin/vite", import.meta.url).pathname,
    ["preview", "--port", String(port), "--strictPort"],
    { cwd: new URL("../", import.meta.url), stdio: ["ignore", "pipe", "pipe"] },
  );
  preview.stdout.on("data", (chunk) => (output += chunk));
  preview.stderr.on("data", (chunk) => (output += chunk));
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch (error) {
      if (attempt === 79) output += String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Production preview did not start:\n${output}`);
});

after(() => preview?.kill("SIGTERM"));

test("production lobby renders Codex Poker and ChatGPT sign-in", async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Codex Poker<\/title>/i);
  assert.match(html, /Sign in with ChatGPT/);
  assert.match(html, /Six-max Texas Hold/);
  assert.match(html, /Virtual points only/);
  assert.doesNotMatch(html, /codex-preview|Building your site/);
});

test("production account API rejects anonymous visitors", async () => {
  const response = await fetch(`${base}/api/results`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Sign in with ChatGPT" });
});

test("production game routes redirect anonymous visitors to ChatGPT sign-in", async () => {
  const response = await fetch(`${base}/play/holdem`, { redirect: "manual" });
  assert.ok([302, 303, 307, 308].includes(response.status));
  assert.match(
    response.headers.get("location") ?? "",
    /^\/signin-with-chatgpt\?return_to=%2Fplay%2Fholdem$/,
  );
});
