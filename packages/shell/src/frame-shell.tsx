"use client";

import type { FramePreferences } from "@frame/theme";
import { Avatar, AvatarFallback } from "@frame/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@frame/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@frame/ui/components/sidebar";
import { TooltipProvider } from "@frame/ui/components/tooltip";
import {
  BoxesIcon,
  ChartBarIcon,
  ChevronUpIcon,
  CircleGaugeIcon,
  HomeIcon,
  MoonIcon,
  OrbitIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SunIcon,
} from "lucide-react";
import { useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import {
  filterFrameNavigation,
  type FrameNavigationItem,
  type FrameNavigationKind,
} from "./navigation.ts";
import {
  FrameNavigationProvider,
  useFrameNavigation,
} from "./navigation-context.tsx";
import {
  FramePreferencesProvider,
  useFramePreferences,
  type FramePreferencesMode,
} from "./preferences-context.tsx";
import { FRAME_SHELL_VERSION } from "./version.ts";

const ICONS = {
  home: HomeIcon,
  admin: ShieldCheckIcon,
  settings: Settings2Icon,
  app: BoxesIcon,
  chart: ChartBarIcon,
  alpha: CircleGaugeIcon,
  beta: BoxesIcon,
  remote: OrbitIcon,
} satisfies Record<FrameNavigationKind, typeof HomeIcon>;

function subscribeToLocation(): () => void {
  return () => undefined;
}

function getBrowserPath(): string {
  return window.location.pathname;
}

function getServerPath(): string {
  return "/";
}

function FrameMark() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-[0.65rem] bg-primary text-sm font-black tracking-[-0.08em] text-primary-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary-foreground)_18%,transparent)]">
      F/
    </span>
  );
}

function NavigationGroup({
  currentAppName,
  items,
  label,
  path,
}: Readonly<{
  currentAppName: string;
  items: readonly FrameNavigationItem[];
  label: string;
  path: string;
}>) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = ICONS[item.kind];
            const isActive = item.appName
              ? item.appName === currentAppName
              : item.href === "/"
                ? currentAppName === "portal" && path === "/"
                : path.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                  <a href={item.href} aria-current={isActive ? "page" : undefined}>
                    <Icon />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ShellScaffold({
  canAccessAdmin,
  children,
  currentAppName,
  currentAppLabel,
  homeHref,
  user,
}: Readonly<{
  canAccessAdmin: boolean;
  children: ReactNode;
  currentAppName: string;
  currentAppLabel: string;
  homeHref: string;
  user: Readonly<{ displayName: string; secondaryLabel: string }>;
}>) {
  const navigation = useFrameNavigation();
  const {
    error,
    isLoading,
    isSaving,
    mode,
    preferences,
    updatePreferences,
  } = useFramePreferences();
  const path = useSyncExternalStore(subscribeToLocation, getBrowserPath, getServerPath);
  const visibleNavigation = useMemo(
    () => filterFrameNavigation(navigation, preferences.hiddenApps, canAccessAdmin),
    [canAccessAdmin, navigation, preferences.hiddenApps],
  );
  const platformItems = visibleNavigation.filter((item) => item.section === "platform");
  const appItems = visibleNavigation.filter((item) => item.section === "apps");

  return (
    <TooltipProvider delayDuration={100}>
      <SidebarProvider
        open={!preferences.sidebarCollapsed}
        onOpenChange={(open) => {
          if (open === !preferences.sidebarCollapsed) return;
          void updatePreferences({ sidebarCollapsed: !open }).catch(() => undefined);
        }}
        style={
          {
            "--sidebar-width": "var(--frame-sidebar-width)",
            "--sidebar-width-icon": "var(--frame-sidebar-width-collapsed)",
          } as CSSProperties
        }
      >
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader className="border-b border-sidebar-border/70 px-2 py-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-12 data-[slot=sidebar-menu-button]:p-2">
                  <a href={homeHref} aria-label="FRAME home">
                    <FrameMark />
                    <span className="grid min-w-0 flex-1 text-left leading-tight">
                      <span className="truncate text-sm font-semibold tracking-[-0.02em]">FRAME</span>
                      <span className="truncate font-mono text-[0.62rem] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                        Unified workspace
                      </span>
                    </span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent className="py-2">
            {platformItems.length > 0 ? (
              <NavigationGroup
                currentAppName={currentAppName}
                items={platformItems}
                label="Workspace"
                path={path}
              />
            ) : null}
            {appItems.length > 0 ? (
              <NavigationGroup
                currentAppName={currentAppName}
                items={appItems}
                label="Applications"
                path={path}
              />
            ) : null}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border/70 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="h-12 data-[state=open]:bg-sidebar-accent">
                      <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                          {user.displayName
                            .split(/\s+/)
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="grid min-w-0 flex-1 text-left leading-tight">
                        <span className="truncate text-sm font-medium">{user.displayName}</span>
                        <span className="truncate text-xs text-sidebar-foreground/55">
                          {user.secondaryLabel}
                        </span>
                      </span>
                      <ChevronUpIcon className="ml-auto" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="end" className="w-64">
                    <DropdownMenuLabel className="font-normal">
                      <span className="block text-sm font-medium">{user.displayName}</span>
                      <span className="block text-xs text-muted-foreground">{user.secondaryLabel}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onSelect={() =>
                          void updatePreferences({
                            theme: preferences.theme === "dark" ? "light" : "dark",
                          }).catch(() => undefined)
                        }
                      >
                        {preferences.theme === "dark" ? <SunIcon /> : <MoonIcon />}
                        Use {preferences.theme === "dark" ? "light" : "dark"} theme
                      </DropdownMenuItem>
                      {mode === "portal" ? (
                        <DropdownMenuItem asChild>
                          <a href="/settings">
                            <Settings2Icon />
                            Preference settings
                          </a>
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="font-mono text-[0.62rem] font-normal uppercase tracking-[0.12em] text-muted-foreground">
                      Shell {FRAME_SHELL_VERSION}
                    </DropdownMenuLabel>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-w-0 overflow-hidden bg-background">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/70 bg-background/88 px-4 backdrop-blur-xl sm:px-6">
            <SidebarTrigger />
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            <span className="truncate text-sm font-medium">{currentAppLabel}</span>
            <span className="ml-auto flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
              <span
                className={`size-1.5 rounded-full ${error ? "bg-destructive" : isLoading || isSaving ? "bg-[var(--frame-warning)]" : "bg-[var(--frame-positive)]"}`}
                aria-hidden="true"
              />
              {error
                ? "local state"
                : isLoading
                  ? "syncing"
                  : isSaving
                    ? "saving"
                    : mode === "local"
                      ? "local"
                      : "synced"}
            </span>
          </header>
          <main className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(var(--frame-grid)_1px,transparent_1px),linear-gradient(90deg,var(--frame-grid)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_68%)]"
              aria-hidden="true"
            />
            <div className="relative mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

export function FrameShell({
  canAccessAdmin = false,
  children,
  currentAppLabel,
  currentAppName,
  homeHref = "/",
  initialPreferences,
  navigation,
  preferencesEndpoint,
  preferencesMode = "portal",
  user,
}: Readonly<{
  canAccessAdmin: boolean;
  children: ReactNode;
  currentAppLabel: string;
  currentAppName: string;
  homeHref?: string;
  initialPreferences: FramePreferences;
  navigation: readonly FrameNavigationItem[];
  preferencesEndpoint?: string;
  preferencesMode?: FramePreferencesMode;
  user: Readonly<{ displayName: string; secondaryLabel: string }>;
}>) {
  return (
    <FrameNavigationProvider navigation={navigation}>
      <FramePreferencesProvider
        endpoint={preferencesEndpoint}
        initialPreferences={initialPreferences}
        mode={preferencesMode}
      >
        <ShellScaffold
          canAccessAdmin={canAccessAdmin}
          currentAppLabel={currentAppLabel}
          currentAppName={currentAppName}
          homeHref={homeHref}
          user={user}
        >
          {children}
        </ShellScaffold>
      </FramePreferencesProvider>
    </FrameNavigationProvider>
  );
}
