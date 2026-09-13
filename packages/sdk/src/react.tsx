"use client";

import { createContext, use, type ReactNode } from "react";

import type { SaasAppSession } from "./server.ts";

const SaasAppSessionContext = createContext<SaasAppSession | null>(null);

export function SaasAppSessionProvider({
  children,
  session,
}: Readonly<{ children: ReactNode; session: SaasAppSession }>) {
  return (
    <SaasAppSessionContext value={session}>
      {children}
    </SaasAppSessionContext>
  );
}

export function useSaasAppSession(): SaasAppSession {
  const session = use(SaasAppSessionContext);
  if (!session) {
    throw new Error("useSaasAppSession must be used inside SaasAppSessionProvider");
  }
  return session;
}
