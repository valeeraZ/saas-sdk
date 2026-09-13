import assert from "node:assert/strict";
import test from "node:test";

import { buildDspAuthenticateUrl, saasFetch, readSaasBrowserToken } from "./browser.ts";

test("reads an encoded browser token without accepting control characters", () => {
  assert.equal(readSaasBrowserToken("dsp-token", "x=1; dsp-token=abc%3A123"), "abc:123");
  assert.equal(readSaasBrowserToken("dsp-token", "dsp-token=abc%0A123"), null);
});

test("builds the DSP renewal URL without putting the token in the URL", () => {
  const url = buildDspAuthenticateUrl(
    {
      baseUrl: "https://dsp.example/",
      clientId: "saas",
      authenticateUrl: "https://dsp.example/authenticate",
    },
    "https://saas.example/launchpad",
  );
  assert.equal(new URL(url).searchParams.get("returnTo"), "https://saas.example/launchpad");
  assert.equal(url.includes("token"), false);
});

test("saasFetch owns and sets the bearer header", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer secret");
    assert.equal(init?.credentials, "omit");
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  try {
    await saasFetch("https://api.example/data", { token: "secret" });
    await assert.rejects(
      saasFetch("https://api.example/data", {
        token: "secret",
        headers: { authorization: "Bearer other" },
      }),
      /owns the Authorization header/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
