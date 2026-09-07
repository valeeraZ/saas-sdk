import assert from "node:assert/strict";
import test from "node:test";

import { resolveFrameAppSession } from "./server.ts";
import { manifest } from "./test-fixture.ts";

const request = { headers: new Headers({ cookie: "dsp-token=test" }) };

test("standalone resolves identity but makes no permissions or Portal calls", async () => {
  let permissionCalls = 0;
  let portalCalls = 0;
  const session = await resolveFrameAppSession(request, manifest, {
    environment: { FRAME_RUNTIME_MODE: "standalone" },
    authClient: {
      async getCurrentUser() {
        return { id: "demo", displayName: "Demo User", secondaryLabel: "demo" };
      },
      async get() {
        permissionCalls += 1;
        return { apps: [] };
      },
    },
    portalClient: {
      async get() {
        portalCalls += 1;
        throw new Error("Portal must not be called");
      },
    },
  });
  assert.equal(session.mode, "standalone");
  assert.deepEqual(session.currentAppRoles, ["developer"]);
  assert.deepEqual(session.navigation.map((item) => item.appName), ["launchpad"]);
  assert.equal(permissionCalls, 0);
  assert.equal(portalCalls, 0);
});

test("integrated joins Portal session with current-App roles in parallel", async () => {
  const session = await resolveFrameAppSession(request, manifest, {
    environment: {
      FRAME_RUNTIME_MODE: "integrated",
      FRAME_PORTAL_ORIGIN: "https://frame.example",
    },
    authClient: {
      async getCurrentUser() {
        throw new Error("Portal supplies the integrated user");
      },
      async get() {
        return { apps: [{ appName: "launchpad", roles: ["developer"] }] };
      },
    },
    portalClient: {
      async get() {
        return {
          mode: "integrated" as const,
          user: { displayName: "Demo User", secondaryLabel: "demo" },
          navigation: [],
          canAccessAdmin: false,
        };
      },
    },
  });
  assert.equal(session.mode, "integrated");
  assert.deepEqual(session.currentAppRoles, ["developer"]);
});
