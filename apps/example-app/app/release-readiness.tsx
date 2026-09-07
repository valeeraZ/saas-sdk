"use client";

import { useFrameAppSession } from "@frame/sdk/react";
import { Button } from "@frame/ui/components/button";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  FileJson2Icon,
  HeartPulseIcon,
  ImageIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

const CHECKS = [
  { label: "Manifest", detail: "Schema v1 matches the App contract", icon: FileJson2Icon },
  { label: "Authentication", detail: "DSP identity and App role resolved", icon: ShieldCheckIcon },
  { label: "Static assets", detail: "Public and Next.js assets stay below basePath", icon: ImageIcon },
  { label: "Health endpoint", detail: "Standard readiness route responds", icon: HeartPulseIcon },
] as const;

export function ReleaseReadiness({
  assetUrl,
  basePath,
  shellVersion,
}: Readonly<{ assetUrl: string; basePath: string; shellVersion: string }>) {
  const session = useFrameAppSession();
  const [isRunning, setIsRunning] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    const timeout = window.setTimeout(() => {
      setCheckedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setIsRunning(false);
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [isRunning]);

  return (
    <div className="mx-auto max-w-[88rem]">
      <header className="flex flex-col gap-7 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
            <a className="font-medium text-primary hover:underline" href={session.homeHref}>Apps</a>
            <span aria-hidden="true">/</span>
            <span>Launchpad</span>
          </nav>
          <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Release readiness</h1>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 rounded-full bg-[var(--frame-positive)]" aria-hidden="true" />
            {session.mode === "integrated" ? "Integrated" : "Standalone"}
          </p>
        </div>
        <Button
          className="h-11 w-full px-6 text-sm font-semibold lg:w-auto"
          disabled={isRunning}
          onClick={() => setIsRunning(true)}
        >
          {isRunning ? "Running checks…" : "Run checks"}
        </Button>
      </header>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0 py-9 xl:pr-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="grid size-20 shrink-0 place-items-center rounded-full border-[3px] border-[var(--frame-positive)] text-[var(--frame-positive)]">
              <CheckCircle2Icon className="size-10" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--frame-positive)]">
                  4 of 4 checks passing
                </h2>
                <span className="text-xs text-muted-foreground">
                  {checkedAt ? `Checked at ${checkedAt}` : "Ready to verify"}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2" aria-label="Four checks passing">
                {CHECKS.map((check) => (
                  <span className="h-1.5 rounded-full bg-[var(--frame-positive)]" key={check.label} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 border-y border-border">
            <div className="hidden grid-cols-[1fr_9rem_1.5rem] gap-4 border-b border-border px-2 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:grid">
              <span>Check</span><span>Status</span><span />
            </div>
            {CHECKS.map(({ detail, icon: Icon, label }) => (
              <button
                className="grid w-full grid-cols-[2.5rem_1fr_auto_1.5rem] items-center gap-3 border-b border-border px-1 py-5 text-left last:border-b-0 hover:bg-muted/45 sm:grid-cols-[2.5rem_1fr_9rem_1.5rem] sm:px-2"
                key={label}
                type="button"
                title={detail}
              >
                <span className="grid size-9 place-items-center text-foreground"><Icon className="size-5" /></span>
                <span className="min-w-0">
                  <span className="block font-medium">{label}</span>
                  <span className="mt-0.5 hidden truncate text-xs text-muted-foreground md:block">{detail}</span>
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--frame-positive)]">
                  <CheckCircle2Icon className="size-4" /> Passing
                </span>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          <section className="mt-10" aria-labelledby="asset-heading">
            <h2 className="text-base font-semibold" id="asset-heading">Base-path safe asset</h2>
            <div className="mt-4 grid overflow-hidden rounded-lg border border-border bg-slate-950 text-slate-100 md:grid-cols-[13rem_1fr]">
              <div className="grid min-h-40 place-items-center border-b border-white/10 p-7 md:border-b-0 md:border-r">
                <img alt="FRAME base-path routing illustration" className="size-28" src={assetUrl} />
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-xs leading-6 text-slate-300 sm:text-sm"><code>{`framePublicAsset(manifest,\n  \"frame-path.svg\"\n)\n\n→ ${assetUrl}`}</code></pre>
            </div>
          </section>
        </section>

        <aside className="border-t border-border py-9 xl:border-l xl:border-t-0 xl:pl-8" aria-label="Runtime details">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Runtime details</h2>
          <dl className="mt-2 divide-y divide-border">
            <Detail label="Current user" value={session.user.displayName} />
            <Detail label="App role" value={session.currentAppRoles.join(", ")} />
            <Detail label="Base path" value={basePath} mono />
            <Detail label="Shell version" value={shellVersion} mono />
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, mono = false, value }: Readonly<{ label: string; mono?: boolean; value: string }>) {
  return (
    <div className="py-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`mt-2 break-words text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
