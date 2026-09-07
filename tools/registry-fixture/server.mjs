import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const host = process.env.REGISTRY_FIXTURE_HOST ?? "0.0.0.0";
const port = Number(process.env.FIXTURE_HTTP_PORT ?? "3200");
const routeFile =
  process.env.REGISTRY_FIXTURE_ROUTES_FILE ??
  new URL("./routes.local.json", import.meta.url);
const maxControlBodyBytes = 262_144;
const authFixtureToken = process.env.AUTH_FIXTURE_TOKEN ?? "frame-dev-token";
const fixtureReturnHosts = new Set(
  (process.env.FIXTURE_RETURN_HOSTS ?? "localhost,127.0.0.1")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const fixtureReturnPorts = new Set(
  (process.env.FIXTURE_RETURN_PORTS ?? "3000,3101,3102,3103")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

let snapshot = parseSnapshot(readFileSync(routeFile, "utf8"));
const failureSystems = new Set();
const registryIdempotency = new Map();
const authIdempotency = new Map();

const fixtureMetadata = {
  "local-alpha": {
    name: "Local Alpha",
    description: "Same-cluster service",
    logo: "CircleGauge",
    owner: "FRAME",
    healthcheck: "/api/frame/health",
  },
  "local-beta": {
    name: "Local Beta",
    description: "Independent Next.js zone",
    logo: "Boxes",
    owner: "FRAME",
    healthcheck: "/api/frame/health",
  },
  "remote-gamma": {
    name: "Remote Gamma",
    description: "Remote-cluster ingress",
    logo: "Orbit",
    owner: "FRAME",
    healthcheck: "/api/frame/health",
  },
};

const appMetadata = new Map(
  snapshot.routes.map(({ appName }) => [
    appName,
    structuredClone(
      fixtureMetadata[appName] ?? {
        name: appName,
        description: "FRAME application",
        logo: "Boxes",
      },
    ),
  ]),
);
const roleDefinitions = new Map([
  [
    "local-alpha",
    [
      { name: "alpha-user", description: "Can use Local Alpha" },
      { name: "frame-admin", description: "Can administer FRAME" },
    ],
  ],
  ["local-beta", [{ name: "beta-user", description: "Can use Local Beta" }]],
  ["remote-gamma", [{ name: "gamma-user", description: "Can use Remote Gamma" }]],
]);

function parseSnapshot(value) {
  const parsed = JSON.parse(value);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Number.isSafeInteger(parsed.version) ||
    !Array.isArray(parsed.routes)
  ) {
    throw new Error("Fixture snapshot must contain an integer version and routes array");
  }
  return structuredClone(parsed);
}

function etag(kind) {
  return `"${kind}-v${snapshot.version}"`;
}

function sendJson(response, status, body, headers = {}) {
  const encoded = JSON.stringify(body);
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(encoded),
    "content-type": "application/json",
    ...headers,
  });
  response.end(encoded);
}

async function readControlBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxControlBodyBytes) throw new Error("Control body is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJson(request) {
  return JSON.parse(await readControlBody(request));
}

function isAuthorized(request) {
  return request.headers.authorization === `Bearer ${authFixtureToken}`;
}

function hasAdminRole() {
  return [...roleDefinitions.values()]
    .flat()
    .some(({ name }) => name === "frame-admin");
}

function requireAdmin(request, response) {
  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "unauthorized" });
    return false;
  }
  if (!hasAdminRole()) {
    sendJson(response, 403, { error: "forbidden" });
    return false;
  }
  return true;
}

function resolveFixtureReturnTo(value) {
  if (!value) return "http://localhost:3000/";
  try {
    const candidate = new URL(value);
    if (
      candidate.protocol === "http:" &&
      fixtureReturnHosts.has(candidate.hostname) &&
      fixtureReturnPorts.has(candidate.port)
    ) {
      return candidate.toString();
    }
  } catch {
    // Fall through to the fixed Portal return URL.
  }
  return "http://localhost:3000/";
}

function registryApp(appName) {
  const route = snapshot.routes.find((candidate) => candidate.appName === appName);
  const metadata = appMetadata.get(appName);
  if (!route || !metadata) return undefined;
  return {
    appName,
    name: metadata.name,
    description: metadata.description,
    logo: metadata.logo,
    basePath: route.basePath,
    frontendTarget: route.frontendTarget,
    active: route.active,
    ...(metadata.owner ? { owner: metadata.owner } : {}),
    ...(metadata.healthcheck ? { healthcheck: metadata.healthcheck } : {}),
  };
}

function navigationCatalog() {
  return {
    version: snapshot.version,
    apps: snapshot.routes.map(({ appName, basePath, active }) => {
      const metadata = appMetadata.get(appName) ?? {
        name: appName,
        description: "FRAME application",
        logo: "Boxes",
      };
      return {
        appName,
        name: metadata.name,
        description: metadata.description,
        logo: metadata.logo,
        basePath,
        active,
      };
    }),
  };
}

function touchSnapshot() {
  snapshot.version += 1;
  snapshot.generatedAt = new Date().toISOString();
}

function requestDigest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validRegistryInput(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof value.appName !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.appName) ||
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    !["Boxes", "ChartBar", "CircleGauge", "Orbit"].includes(value.logo) ||
    typeof value.basePath !== "string" ||
    !/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.basePath) ||
    ["/admin", "/api", "/app-unavailable", "/settings"].includes(value.basePath) ||
    typeof value.frontendTarget !== "string" ||
    "active" in value
  ) {
    return false;
  }
  try {
    const target = new URL(value.frontendTarget);
    const allowedHost =
      ["localhost", "127.0.0.1"].includes(target.hostname) ||
      target.hostname.endsWith(".svc.cluster.local") ||
      target.hostname.endsWith(".company.net");
    return (
      ["http:", "https:"].includes(target.protocol) &&
      !target.username &&
      !target.password &&
      target.pathname === "/" &&
      !target.search &&
      !target.hash &&
      allowedHost
    );
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/__fixture/session") {
    response.writeHead(302, {
      location: resolveFixtureReturnTo(url.searchParams.get("returnTo")),
      "set-cookie": `dsp-token=${encodeURIComponent(authFixtureToken)}; Path=/; SameSite=Lax`,
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/config") {
    sendJson(response, 200, {
      dsp: {
        base_url: `http://localhost:${port}`,
        client_id: "frame-local-development",
        url: { authenticate: "/__fixture/session" },
      },
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/v1/authorization/current_user") {
    if (!isAuthorized(request)) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }
    sendJson(response, 200, {
      display_name: "Frame Demo User",
      employee_id: "frame-demo-user",
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/permissions") {
    if (!isAuthorized(request)) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }
    sendJson(response, 200, {
      apps: [...roleDefinitions.entries()].map(([appName, roles]) => ({
        appName,
        roles: roles.map(({ name }) => name),
      })),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/internal/frame/registry/apps") {
    if (failureSystems.has("registry")) {
      sendJson(response, 503, { error: "fixture Registry outage enabled" });
      return;
    }
    if (request.headers["if-none-match"] === etag("apps")) {
      response.writeHead(304, {
        etag: etag("apps"),
        "cache-control": "no-store",
      });
      response.end();
      return;
    }
    sendJson(response, 200, navigationCatalog(), { etag: etag("apps") });
    return;
  }

  if (request.method === "GET" && url.pathname === "/internal/frame/registry/routes") {
    if (failureSystems.has("registry")) {
      sendJson(response, 503, { error: "fixture Registry outage enabled" });
      return;
    }
    if (request.headers["if-none-match"] === etag("routes")) {
      response.writeHead(304, {
        etag: etag("routes"),
        "cache-control": "no-store",
      });
      response.end();
      return;
    }
    sendJson(response, 200, snapshot, { etag: etag("routes") });
    return;
  }

  if (url.pathname === "/admin/frame/apps" && request.method === "GET") {
    if (!requireAdmin(request, response)) return;
    if (failureSystems.has("registry")) {
      sendJson(response, 503, { error: "fixture Registry outage enabled" });
      return;
    }
    sendJson(response, 200, {
      apps: snapshot.routes.map(({ appName }) => registryApp(appName)),
    });
    return;
  }

  if (url.pathname === "/admin/frame/apps" && request.method === "POST") {
    if (!requireAdmin(request, response)) return;
    if (failureSystems.has("registry")) {
      sendJson(response, 503, { error: "fixture Registry outage enabled" });
      return;
    }
    try {
      const body = await readJson(request);
      const key = request.headers["idempotency-key"];
      if (typeof key !== "string" || !validRegistryInput(body)) {
        sendJson(response, 400, { error: "invalid Registry App request" });
        return;
      }
      const digest = requestDigest(body);
      const previous = registryIdempotency.get(key);
      if (previous && previous.digest !== digest) {
        sendJson(response, 409, { error: "idempotency key conflict" });
        return;
      }
      const existing = registryApp(body.appName);
      if (previous || existing) {
        const expected = previous?.appName ?? body.appName;
        sendJson(response, 200, registryApp(expected));
        return;
      }
      if (snapshot.routes.some(({ basePath }) => basePath === body.basePath)) {
        sendJson(response, 409, { error: "basePath already exists" });
        return;
      }
      snapshot.routes.push({
        appName: body.appName,
        basePath: body.basePath,
        frontendTarget: new URL(body.frontendTarget).origin,
        active: false,
      });
      appMetadata.set(body.appName, {
        name: body.name,
        description: body.description,
        logo: body.logo,
        ...(body.owner ? { owner: body.owner } : {}),
        ...(body.healthcheck ? { healthcheck: body.healthcheck } : {}),
      });
      registryIdempotency.set(key, { appName: body.appName, digest });
      touchSnapshot();
      sendJson(response, 201, registryApp(body.appName));
    } catch {
      sendJson(response, 400, { error: "invalid Registry App request" });
    }
    return;
  }

  const adminMatch = url.pathname.match(
    /^\/admin\/frame\/apps\/([a-z0-9-]+)\/(roles|runtime|activate|deactivate)$/,
  );
  if (adminMatch) {
    if (!requireAdmin(request, response)) return;
    const [, appName, operation] = adminMatch;

    if (operation === "roles" && request.method === "PUT") {
      if (failureSystems.has("auth")) {
        sendJson(response, 503, { error: "fixture Auth outage enabled" });
        return;
      }
      try {
        const body = await readJson(request);
        const key = request.headers["idempotency-key"];
        if (
          typeof key !== "string" ||
          !registryApp(appName) ||
          !Array.isArray(body.roles) ||
          body.roles.length === 0 ||
          body.roles.some(
            (role) =>
              typeof role !== "object" ||
              role === null ||
              typeof role.name !== "string" ||
              !/^[a-z0-9]+(?:[-_:][a-z0-9]+)*$/.test(role.name) ||
              typeof role.description !== "string" ||
              role.description.length === 0,
          )
        ) {
          sendJson(response, 400, { error: "invalid role request" });
          return;
        }
        const digest = requestDigest(body);
        const previous = authIdempotency.get(key);
        if (previous && previous.digest !== digest) {
          sendJson(response, 409, { error: "idempotency key conflict" });
          return;
        }
        roleDefinitions.set(appName, structuredClone(body.roles));
        authIdempotency.set(key, { appName, digest });
        sendJson(response, 200, {
          appName,
          roles: roleDefinitions.get(appName),
        });
      } catch {
        sendJson(response, 400, { error: "invalid role request" });
      }
      return;
    }

    if (operation === "runtime" && request.method === "GET") {
      if (failureSystems.has("registry") || !registryApp(appName)) {
        sendJson(response, failureSystems.has("registry") ? 503 : 404, {
          error: "runtime unavailable",
        });
        return;
      }
      const ready = !failureSystems.has("validation");
      sendJson(response, 200, {
        appName,
        healthy: ready,
        shellCompatible: ready,
        staticResources: ready,
        checkedAt: new Date().toISOString(),
      });
      return;
    }

    if (
      (operation === "activate" || operation === "deactivate") &&
      request.method === "POST"
    ) {
      if (failureSystems.has("registry")) {
        sendJson(response, 503, { error: "fixture Registry outage enabled" });
        return;
      }
      const app = registryApp(appName);
      if (!app) {
        sendJson(response, 404, { error: "App not found" });
        return;
      }
      if (operation === "activate" && !roleDefinitions.has(appName)) {
        sendJson(response, 409, { error: "roles are not configured" });
        return;
      }
      const route = snapshot.routes.find((candidate) => candidate.appName === appName);
      route.active = operation === "activate";
      touchSnapshot();
      sendJson(response, 200, registryApp(appName));
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { live: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/__fixture/state") {
    sendJson(response, 200, {
      failureSystems: [...failureSystems],
      snapshot,
      catalog: navigationCatalog(),
      roles: Object.fromEntries(roleDefinitions),
    });
    return;
  }

  if (request.method === "PUT" && url.pathname === "/__fixture/routes") {
    try {
      const nextSnapshot = parseSnapshot(await readControlBody(request));
      if (nextSnapshot.version <= snapshot.version) {
        sendJson(response, 409, {
          error: `version must be greater than ${snapshot.version}`,
        });
        return;
      }
      snapshot = nextSnapshot;
      for (const { appName } of snapshot.routes) {
        if (!appMetadata.has(appName)) {
          appMetadata.set(appName, {
            name: appName,
            description: "FRAME application",
            logo: "Boxes",
          });
        }
      }
      sendJson(response, 200, snapshot, { etag: etag("routes") });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "invalid snapshot",
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/__fixture/toggle") {
    const appName = url.searchParams.get("app");
    const active = url.searchParams.get("active");
    const route = snapshot.routes.find((candidate) => candidate.appName === appName);
    if (!route || (active !== "true" && active !== "false")) {
      sendJson(response, 400, { error: "valid app and boolean active are required" });
      return;
    }
    route.active = active === "true";
    touchSnapshot();
    sendJson(response, 200, snapshot, { etag: etag("routes") });
    return;
  }

  if (request.method === "POST" && url.pathname === "/__fixture/failure") {
    const enabled = url.searchParams.get("enabled");
    const system = url.searchParams.get("system") ?? "registry";
    if (
      (enabled !== "true" && enabled !== "false") ||
      !["registry", "auth", "validation"].includes(system)
    ) {
      sendJson(response, 400, { error: "valid system and boolean enabled are required" });
      return;
    }
    if (enabled === "true") failureSystems.add(system);
    else failureSystems.delete(system);
    sendJson(response, 200, { failureSystems: [...failureSystems] });
    return;
  }

  sendJson(response, 404, { error: "not found" });
});

server.listen(port, host, () => {
  console.log(`[registry-fixture] listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
