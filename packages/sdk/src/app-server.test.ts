import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { generateKeyPair, SignJWT } from "jose";
import { createHash, randomUUID } from "node:crypto";
import {
  createSaasAppHandler,
  requireSaasApp,
  readSaasVerifiedContext,
} from "./app-server.ts";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
test("application adapter independently verifies request bindings, replay and concurrent user contexts", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const replay = new Set<string>();
  const handler = createSaasAppHandler(
    async (req, res) => {
      const before = requireSaasApp().userId;
      const header = String(req.headers["x-saas-verified-context"]);
      assert.equal(readSaasVerifiedContext(header).userId, before);
      assert.throws(() => readSaasVerifiedContext(header.replace(/.$/, "x")));
      await new Promise((resolve) => setTimeout(resolve, 5));
      assert.equal(requireSaasApp().userId, before);
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      res.end(
        JSON.stringify({
          user: before,
          presentation: requireSaasApp().presentation,
          body: Buffer.concat(chunks).toString(),
        }),
      );
    },
    {
      mount: "reports",
      assetVersion: "v1",
      issuer: "https://portal.test",
      appId: a,
      deploymentId: b,
      key: publicKey,
      claimReplay: async (id) => {
        if (replay.has(id)) return false;
        replay.add(id);
        return true;
      },
    },
  );
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  async function signed(
    tenant: string,
    overrides: Record<string, unknown> = {},
  ) {
    const path = "/apps/reports/api";
    return new SignJWT({
      user:{id:tenant,displayName:"Test",email:"test@example.test"},
      basePath: "/apps/reports",
      deploymentId: b,
      roles: ["viewer"],
      presentation: {
        theme: "dark",
        sidebarCollapsed: true,
        locale: "en",
        roles: ["admin"],
      },
      method: "POST",
      path,
      bodyHash: createHash("sha256").update("hello").digest("hex"),
      ...overrides,
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer("https://portal.test")
      .setAudience(a)
      .setSubject(tenant)
      .setIssuedAt()
      .setExpirationTime("30s")
      .setJti(randomUUID())
      .sign(privateKey);
  }
  async function send(
    tenant: string,
    token?: string,
    body = "hello",
    extra = {},
  ) {
    return fetch(origin + "/apps/reports/api", {
      method: "POST",
      body,
      headers: {
        origin: "https://portal.test",
        ...(token ? { "x-saas-request": token } : {}),
        ...extra,
      },
    });
  }
  try {
    const token = await signed(a);
    const success = await send(a, token);
    assert.equal(success.status, 200);
    const successBody = await success.json();
    assert.equal(successBody.body, "hello");
    assert.deepEqual(successBody.presentation, {
      theme: "dark",
      sidebarCollapsed: true,
      locale: "en",
    });
    const invalid = await send(
      a,
      await signed(a, {
        presentation: {
          theme: "unsafe",
          locale: "de",
          sidebarCollapsed: "true",
        },
      }),
    );
    assert.deepEqual((await invalid.json()).presentation, {
      theme: "light",
      locale: "zh",
      sidebarCollapsed: false,
    });
    assert.equal((await send(a, token)).status, 401);
    assert.equal((await send(a)).status, 401);
    assert.equal((await send(a, "forged")).status, 401);
    for (const overrides of [
      { tenantId: b },
      { deploymentId: a },
      { method: "GET" },
      { path: "/wrong" },
      { bodyHash: "bad" },
      { basePath: "/wrong" },
    ])
      assert.equal((await send(a, await signed(a, overrides))).status, 403);
    assert.equal((await send(a, await signed(a), "tampered")).status, 403);
    assert.equal(
      (await send(a, await signed(a), "hello", { cookie: "portal=secret" }))
        .status,
      403,
    );
    assert.equal(
      (await send(a, await signed(a), "hello", { origin: "https://evil.test" }))
        .status,
      403,
    );
    const results = await Promise.all(
      [a, b].map(async (tenant) =>
        (await send(tenant, await signed(tenant))).json(),
      ),
    );
    assert.deepEqual(
      results.map((value) => value.user),
      [a, b],
    );
    assert.throws(() => requireSaasApp());
  } finally {
    server.close();
  }
});
