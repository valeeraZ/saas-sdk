import assert from "node:assert/strict";
import test from "node:test";

import {
  FramePortalSessionClient,
  FramePortalSessionError,
  loadFramePortalSessionConfig,
  parseIntegratedFrameSession,
} from "./integrated-session.ts";

const sessionPayload = {
  mode: "integrated",
  user: { displayName: "Ada Frame", secondaryLabel: "ada" },
  navigation: [
    {
      appName: "risk-dashboard",
      description: "Risk reports",
      href: "/risk",
      kind: "chart",
      label: "Risk Dashboard",
      section: "apps",
    },
  ],
  canAccessAdmin: true,
};

test("validates the Portal-provided browser-safe session", () => {
  assert.equal(parseIntegratedFrameSession(sessionPayload).navigation[0]?.href, "/risk");
  assert.throws(() =>
    parseIntegratedFrameSession({
      ...sessionPayload,
      navigation: [
        {
          ...sessionPayload.navigation[0],
          frontendTarget: "https://risk.internal.example",
        },
      ],
    }),
  );
});

test("forwards only the Cookie to the configured Portal session endpoint", async () => {
  let observedHeaders = new Headers();
  const client = new FramePortalSessionClient(
    loadFramePortalSessionConfig({
      FRAME_PORTAL_ORIGIN: "https://portal.internal.example",
    }),
    async (_input, init) => {
      observedHeaders = new Headers(init?.headers);
      return Response.json(sessionPayload);
    },
  );
  await client.get({
    headers: new Headers({
      authorization: "Bearer attacker",
      cookie: "dsp-session=opaque",
      "x-user-id": "attacker",
    }),
  });
  assert.equal(observedHeaders.get("cookie"), "dsp-session=opaque");
  assert.equal(observedHeaders.get("authorization"), null);
  assert.equal(observedHeaders.get("x-user-id"), null);
});

test("fails closed when Portal denies the integrated session", async () => {
  const client = new FramePortalSessionClient(
    loadFramePortalSessionConfig({}),
    async () => new Response(null, { status: 403 }),
  );
  await assert.rejects(
    () => client.get({ headers: new Headers({ cookie: "dsp-session=expired" }) }),
    (error: unknown) =>
      error instanceof FramePortalSessionError && error.category === "unauthorized",
  );
});
