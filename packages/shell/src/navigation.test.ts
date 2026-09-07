import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFrameNavigation,
  buildStandaloneNavigation,
  filterFrameNavigation,
  FRAME_NAVIGATION_FIXTURE,
} from "./navigation.ts";

test("standalone navigation contains only the current App without roles", () => {
  const navigation = buildStandaloneNavigation({
    appName: "local-alpha",
    name: "Local Alpha",
    description: "Same-cluster service",
    logo: "CircleGauge",
    basePath: "/alpha",
  });

  assert.deepEqual(
    navigation.map(({ appName, href, section }) => ({ appName, href, section })),
    [{ appName: "local-alpha", href: "/alpha", section: "apps" }],
  );
});

test("filters hidden Apps without affecting platform entries", () => {
  const visible = filterFrameNavigation(FRAME_NAVIGATION_FIXTURE, ["local-beta"], false);
  assert.equal(visible.some((item) => item.appName === "local-beta"), false);
  assert.equal(visible.some((item) => item.kind === "home"), true);
  assert.equal(visible.some((item) => item.kind === "settings"), true);
});

test("keeps Admin conditional behind the provider seam", () => {
  assert.equal(
    filterFrameNavigation(FRAME_NAVIGATION_FIXTURE, [], false).some(
      (item) => item.kind === "admin",
    ),
    false,
  );
  assert.equal(
    filterFrameNavigation(FRAME_NAVIGATION_FIXTURE, [], true).some(
      (item) => item.kind === "admin",
    ),
    true,
  );
});

test("builds navigation only from active Apps with a returned role", () => {
  const navigation = buildFrameNavigation(
    [
      {
        appName: "risk-dashboard",
        name: "Risk Dashboard",
        description: "Risk reports",
        logo: "ChartBar",
        basePath: "/risk",
        active: true,
      },
      {
        appName: "inactive-app",
        name: "Inactive",
        description: "Not published",
        logo: "Boxes",
        basePath: "/inactive",
        active: false,
      },
      {
        appName: "unassigned-app",
        name: "Unassigned",
        description: "No role",
        logo: "Boxes",
        basePath: "/unassigned",
        active: true,
      },
    ],
    [
      { appName: "risk-dashboard", roles: ["risk-user"] },
      { appName: "inactive-app", roles: ["inactive-user"] },
      { appName: "unknown-app", roles: ["unknown-user"] },
    ],
  );

  assert.deepEqual(
    navigation.filter((item) => item.appName !== null).map((item) => item.appName),
    ["risk-dashboard"],
  );
  assert.equal(navigation.find((item) => item.appName === "risk-dashboard")?.kind, "chart");
});

test("hidden preferences are applied after role and active filtering", () => {
  const navigation = buildFrameNavigation(
    [
      {
        appName: "risk-dashboard",
        name: "Risk Dashboard",
        description: "Risk reports",
        logo: "ChartBar",
        basePath: "/risk",
        active: true,
      },
    ],
    [{ appName: "risk-dashboard", roles: ["risk-user"] }],
  );
  assert.equal(
    filterFrameNavigation(navigation, ["risk-dashboard"], false).some(
      (item) => item.appName === "risk-dashboard",
    ),
    false,
  );
});
