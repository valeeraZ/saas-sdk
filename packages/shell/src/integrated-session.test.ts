import assert from "node:assert/strict";
import test from "node:test";

import {
  SaasPortalSessionClient,
  SaasPortalSessionError,
  loadSaasPortalSessionConfig,
  parseIntegratedSaasSession,
} from "./integrated-session.ts";

const sessionPayload = {
  mode: "integrated",
  user: { displayName: "Ada Saas", secondaryLabel: "ada" },
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
  assert.equal(parseIntegratedSaasSession(sessionPayload).navigation[0]?.href, "/risk");
  assert.throws(() =>
    parseIntegratedSaasSession({
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
  const client = new SaasPortalSessionClient(
    loadSaasPortalSessionConfig({
      SAAS_PORTAL_ORIGIN: "https://portal.internal.example",
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
  const client = new SaasPortalSessionClient(
    loadSaasPortalSessionConfig({}),
    async () => new Response(null, { status: 403 }),
  );
  await assert.rejects(
    () => client.get({ headers: new Headers({ cookie: "dsp-session=expired" }) }),
    (error: unknown) =>
      error instanceof SaasPortalSessionError && error.category === "unauthorized",
  );
});
