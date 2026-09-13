export function GET() {
  return Response.json(
    { status: "ok", appName: "launchpad", shellVersion: "0.1.0" },
    { headers: { "cache-control": "no-store" } },
  );
}
