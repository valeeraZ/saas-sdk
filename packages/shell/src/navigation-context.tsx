"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { FrameNavigationItem } from "./navigation.ts";

const FrameNavigationContext =
  createContext<readonly FrameNavigationItem[] | null>(null);

export function FrameNavigationProvider({
  children,
  navigation,
}: Readonly<{
  children: ReactNode;
  navigation: readonly FrameNavigationItem[];
}>) {
  return (
    <FrameNavigationContext.Provider value={navigation}>
      {children}
    </FrameNavigationContext.Provider>
  );
}

export function useFrameNavigation(): readonly FrameNavigationItem[] {
  const navigation = useContext(FrameNavigationContext);
  if (!navigation) {
    throw new Error("useFrameNavigation must be used inside FrameNavigationProvider");
  }
  return navigation;
}
