"use client";

import { createContext, use, type ReactNode } from "react";

import type { FrameAppSession } from "./server.ts";

const FrameAppSessionContext = createContext<FrameAppSession | null>(null);

export function FrameAppSessionProvider({
  children,
  session,
}: Readonly<{ children: ReactNode; session: FrameAppSession }>) {
  return (
    <FrameAppSessionContext value={session}>
      {children}
    </FrameAppSessionContext>
  );
}

export function useFrameAppSession(): FrameAppSession {
  const session = use(FrameAppSessionContext);
  if (!session) {
    throw new Error("useFrameAppSession must be used inside FrameAppSessionProvider");
  }
  return session;
}
