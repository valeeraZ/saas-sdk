import assert from "node:assert/strict";
import test from "node:test";

import {
  FramePermissionsClient,
  FramePermissionsError,
  hasFrameAdminRole,
  loadFrameAuthConfig,
  loadFrameRuntimeMode,
  parseFrameCurrentUser,
  parseFrameDspConfig,
  parseFramePermissions,
  parseLegacyFramePermissions,
  readDspToken,
  resolveFrameServerSession,
} from "./index.ts";

const permissionPayload = {
  apps: [
    {
      appName: "risk-dashboard",
      roles: ["risk-user", "frame-admin"],
    },
  ],
};

const legacyPermissionPayload = {
  apps: [
    {
      ...permissionPayload.apps[0],
      name: "Risk Dashboard",
      description: "Risk reports",
      logo: "ChartBar",
      basePath: "/risk",
      active: true,
    },
  ],
};

const currentUserPayload = {
  display_name: "Ada Frame",
  employee_id: "auth-user-42",
};

test("reads only the configured DSP Cookie as the credential", () => {
  const request = new Request("http://frame.test", {
    headers: {
      authorization: "Bearer attacker",
      cookie: "other=value; dsp-session=trusted%3Dtoken",
      "x-user-id": "attacker",
    },
  });
  assert.equal(readDspToken(request, "dsp-session"), "trusted=token");
});

test("rejects a request without the configured DSP Cookie", () => {
  assert.throws(
    () => readDspToken(new Request("http://frame.test"), "dsp-session"),
    (error: unknown) =>
      error instanceof FramePermissionsError && error.category === "missing_token",
  );
});

test("validates and freezes the Auth Service permissions contract", () => {
  const permissions = parseFramePermissions(permissionPayload);
  assert.equal(permissions.apps[0]?.appName, "risk-dashboard");
  assert.equal(Object.isFrozen(permissions.apps), true);
  assert.throws(() =>
    parseFramePermissions({
      ...permissionPayload,
      apps: [...permissionPayload.apps, permissionPayload.apps[0]],
    }),
  );
  assert.throws(() => parseFramePermissions(legacyPermissionPayload));
  assert.deepEqual(
    parseLegacyFramePermissions(legacyPermissionPayload),
    permissionPayload,
  );
});

test("validates current-user as the stable identity source", () => {
  const currentUser = parseFrameCurrentUser(currentUserPayload);
  assert.deepEqual(currentUser, {
    id: "auth-user-42",
    displayName: "Ada Frame",
    secondaryLabel: "auth-user-42",
  });
  assert.throws(() => parseFrameCurrentUser({ display_name: "Missing ID" }));
});

test("projects only public DSP configuration fields", () => {
  const dspConfig = parseFrameDspConfig({
    dsp: {
      base_url: "https://dsp.example.com",
      client_id: "frame-web",
      client_secret: "must-not-reach-the-browser",
      url: { authenticate: "/authenticate" },
    },
  });
  assert.deepEqual(dspConfig, {
    baseUrl: "https://dsp.example.com/",
    clientId: "frame-web",
    authenticateUrl: "https://dsp.example.com/authenticate",
  });
  assert.equal("clientSecret" in dspConfig, false);
});

test("forwards the DSP token to current-user and permissions in parallel", async () => {
  const observedRequests: Array<{
    url: string;
    authorization: string | null;
    credentials: RequestCredentials | undefined;
  }> = [];
  const config = loadFrameAuthConfig({
    FRAME_AUTH_SERVICE_URL: "https://auth.internal.example",
    FRAME_DSP_TOKEN_COOKIE: "dsp-session",
    FRAME_ADMIN_ROLES: "frame-admin",
  });
  const client = new FramePermissionsClient(config, async (input, init) => {
    const url = String(input);
    observedRequests.push({
      url,
      authorization: new Headers(init?.headers).get("authorization"),
      credentials: init?.credentials,
    });
    return Response.json(
      url.endsWith("/v1/authorization/current_user")
        ? currentUserPayload
        : permissionPayload,
    );
  });
  const request = new Request("https://frame.example/settings", {
    headers: { cookie: "dsp-session=opaque-token" },
  });

  const session = await resolveFrameServerSession(request, "integrated", client);

  assert.equal(config.permissionsUrl, "https://auth.internal.example/permissions");
  assert.deepEqual(
    observedRequests.map((entry) => entry.url).sort(),
    [
      "https://auth.internal.example/permissions",
      "https://auth.internal.example/v1/authorization/current_user",
    ],
  );
  assert.equal(
    observedRequests.every(
      (entry) =>
        entry.authorization === "Bearer opaque-token" &&
        entry.credentials === "omit",
    ),
    true,
  );
  assert.deepEqual(session.user, {
    displayName: "Ada Frame",
    secondaryLabel: "auth-user-42",
  });
  assert.equal(session.canAccessAdmin, true);
  assert.equal(session.mode, "integrated");
});

test("standalone mode resolves identity without requesting permissions", async () => {
  const observedUrls: string[] = [];
  const client = new FramePermissionsClient(
    loadFrameAuthConfig({
      FRAME_AUTH_SERVICE_URL: "https://auth.internal.example",
      FRAME_DSP_TOKEN_COOKIE: "dsp-session",
    }),
    async (input) => {
      const url = String(input);
      observedUrls.push(url);
      if (url.endsWith("/permissions")) {
        throw new Error("standalone mode must not request permissions");
      }
      return Response.json(currentUserPayload);
    },
  );
  const request = new Request("http://localhost:3101/alpha", {
    headers: { cookie: "dsp-session=opaque-token" },
  });

  const session = await resolveFrameServerSession(request, "standalone", client);

  assert.deepEqual(observedUrls, [
    "https://auth.internal.example/v1/authorization/current_user",
  ]);
  assert.equal(session.mode, "standalone");
  assert.deepEqual(session.grants, []);
  assert.equal(session.canAccessAdmin, false);
  assert.equal(session.user.displayName, "Ada Frame");
});

test("runtime mode defaults safely to integrated and rejects unknown values", () => {
  assert.equal(loadFrameRuntimeMode({}), "integrated");
  assert.equal(loadFrameRuntimeMode({ FRAME_RUNTIME_MODE: "standalone" }), "standalone");
  assert.throws(() => loadFrameRuntimeMode({ FRAME_RUNTIME_MODE: "local" }));
});

test("loads DSP config without forwarding browser credentials", async () => {
  let observedAuthorization: string | null = "not-called";
  let observedCredentials: RequestCredentials | undefined;
  const client = new FramePermissionsClient(
    loadFrameAuthConfig({
      FRAME_AUTH_SERVICE_URL: "https://auth.internal.example",
    }),
    async (_input, init) => {
      observedAuthorization = new Headers(init?.headers).get("authorization");
      observedCredentials = init?.credentials;
      return Response.json({
        dsp: {
          base_url: "https://dsp.example.com",
          client_id: "frame-web",
          client_secret: "server-only",
          url: { authenticate: "/authenticate" },
        },
      });
    },
  );

  assert.equal((await client.getDspConfig()).clientId, "frame-web");
  assert.equal(observedAuthorization, null);
  assert.equal(observedCredentials, "omit");
});

test("Admin access is denied when no configured role is returned", () => {
  const permissions = parseFramePermissions(permissionPayload);
  assert.equal(hasFrameAdminRole(permissions, new Set(["platform-owner"])), false);
  assert.equal(hasFrameAdminRole(permissions, new Set()), false);
});

test("fails closed when Auth Service rejects the DSP token", async () => {
  const client = new FramePermissionsClient(
    loadFrameAuthConfig({ FRAME_DSP_TOKEN_COOKIE: "dsp-session" }),
    async () => new Response(null, { status: 401 }),
  );
  await assert.rejects(
    () =>
      client.get(
        new Request("http://frame.test", {
          headers: { cookie: "dsp-session=expired-token" },
        }),
      ),
    (error: unknown) =>
      error instanceof FramePermissionsError && error.category === "unauthorized",
  );
});

test("rejects oversized permissions responses", async () => {
  const client = new FramePermissionsClient(
    loadFrameAuthConfig({
      FRAME_DSP_TOKEN_COOKIE: "dsp-session",
      FRAME_AUTH_RESPONSE_LIMIT_BYTES: "32",
    }),
    async () => Response.json(permissionPayload),
  );
  await assert.rejects(
    () =>
      client.get(
        new Request("http://frame.test", {
          headers: { cookie: "dsp-session=opaque-token" },
        }),
      ),
    (error: unknown) =>
      error instanceof FramePermissionsError && error.category === "invalid_response",
  );
});

test("applies the deadline through the permissions body read", async () => {
  const config = loadFrameAuthConfig({
    FRAME_DSP_TOKEN_COOKIE: "dsp-session",
    FRAME_AUTH_TIMEOUT_MS: "5",
  });
  const client = new FramePermissionsClient(config, async (_input, init) => {
    const signal = init?.signal;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        signal?.addEventListener("abort", () => controller.error(new Error("aborted")));
      },
    });
    return new Response(body, {
      headers: { "content-type": "application/json" },
    });
  });

  await assert.rejects(
    () =>
      client.get(
        new Request("http://frame.test", {
          headers: { cookie: "dsp-session=opaque-token" },
        }),
      ),
    (error: unknown) =>
      error instanceof FramePermissionsError && error.category === "unavailable",
  );
});
