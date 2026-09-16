import assert from "node:assert/strict";
import test from "node:test";
import {
  tenantBasePath,
  tenantHref,
  publicTenantContext,
  tenantImageUrl,
} from "./tenant.ts";
const tenantId = "00000000-0000-4000-8000-000000000001";
const context = {
  tenantId,
  mount: "reports",
  userId: tenantId,
  appId: tenantId,
  deploymentId: tenantId,
  basePath: "forged",
  roles: ["viewer"],
};
test("tenant links stay inside their own mount and strip private context fields", () => {
  assert.equal(
    tenantHref(context, "/notes?q=hello#top"),
    `/tenants/${tenantId}/apps/reports/notes?q=hello#top`,
  );
  for (const path of [
    "//evil.test",
    "https://evil.test",
    "/../auth",
    "/%2e%2e/auth",
    "/%252e",
    "/a%2fb",
    "/a\\b",
  ])
    assert.throws(() => tenantHref(context, path));
  assert.throws(() => tenantBasePath("bad", "reports"));
  const exposed = publicTenantContext({
    ...context,
    accessToken: "secret",
  } as typeof context);
  assert.equal(exposed.basePath, tenantBasePath(tenantId, "reports"));
  assert.equal("accessToken" in exposed, false);
  assert.ok(Object.isFrozen(exposed.roles));
  assert.match(
    tenantImageUrl(exposed, "/public/logo.png", 64),
    /_next\/image\?url=/,
  );
  assert.throws(() => tenantImageUrl(exposed, "https://evil.test", 64));
});
