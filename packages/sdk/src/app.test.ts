import assert from "node:assert/strict";
import test from "node:test";
import {
  appBasePath,
  appHref,
  publicAppContext,
  appImageUrl,
} from "./app.ts";
const userId = "00000000-0000-4000-8000-000000000001";
const context = {
  mount: "reports",
  userId,
  user:{id:userId,displayName:"Test",email:"test@example.test"},
  appId: userId,
  deploymentId: userId,
  basePath: "forged",
  roles: ["viewer"],
};
test("application links stay inside their own mount and strip private context fields", () => {
  assert.equal(
    appHref(context, "/notes?q=hello#top"),
    "/apps/reports/notes?q=hello#top",
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
    assert.throws(() => appHref(context, path));
  assert.throws(() => appBasePath("bad/name"));
  const exposed = publicAppContext({
    ...context,
    accessToken: "secret",
  } as typeof context);
  assert.equal(exposed.basePath, appBasePath("reports"));
  assert.equal("accessToken" in exposed, false);
  assert.ok(Object.isFrozen(exposed.roles));
  assert.match(
    appImageUrl(exposed, "/public/logo.png", 64),
    /_next\/image\?url=/,
  );
  assert.throws(() => appImageUrl(exposed, "https://evil.test", 64));
});
