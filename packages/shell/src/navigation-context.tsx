"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { SaasNavigationItem } from "./navigation.ts";

const SaasNavigationContext =
  createContext<readonly SaasNavigationItem[] | null>(null);

export function SaasNavigationProvider({
  children,
  navigation,
}: Readonly<{
  children: ReactNode;
  navigation: readonly SaasNavigationItem[];
}>) {
  return (
    <SaasNavigationContext.Provider value={navigation}>
      {children}
    </SaasNavigationContext.Provider>
  );
}

export function useSaasNavigation(): readonly SaasNavigationItem[] {
  const navigation = useContext(SaasNavigationContext);
  if (!navigation) {
    throw new Error("useSaasNavigation must be used inside SaasNavigationProvider");
  }
  return navigation;
}
