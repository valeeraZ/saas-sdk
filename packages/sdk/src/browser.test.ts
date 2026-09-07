import assert from "node:assert/strict";
import test from "node:test";

import { buildDspAuthenticateUrl, frameFetch, readFrameBrowserToken } from "./browser.ts";

test("reads an encoded browser token without accepting control characters", () => {
  assert.equal(readFrameBrowserToken("dsp-token", "x=1; dsp-token=abc%3A123"), "abc:123");
  assert.equal(readFrameBrowserToken("dsp-token", "dsp-token=abc%0A123"), null);
});

test("builds the DSP renewal URL without putting the token in the URL", () => {
  const url = buildDspAuthenticateUrl(
    {
      baseUrl: "https://dsp.example/",
      clientId: "frame",
      authenticateUrl: "https://dsp.example/authenticate",
    },
    "https://frame.example/launchpad",
  );
  assert.equal(new URL(url).searchParams.get("returnTo"), "https://frame.example/launchpad");
  assert.equal(url.includes("token"), false);
});

test("frameFetch owns and sets the bearer header", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer secret");
    assert.equal(init?.credentials, "omit");
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  try {
    await frameFetch("https://api.example/data", { token: "secret" });
    await assert.rejects(
      frameFetch("https://api.example/data", {
        token: "secret",
        headers: { authorization: "Bearer other" },
      }),
      /owns the Authorization header/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
