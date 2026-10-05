"use client";

import type { SaasPreferences } from "@saas-platform/theme";
import { Avatar, AvatarFallback } from "@saas-platform/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@saas-platform/ui/components/dropdown-menu";
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
} from "@saas-platform/ui/components/sidebar";
import { TooltipProvider } from "@saas-platform/ui/components/tooltip";
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
import {
  useMemo,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  filterSaasNavigation,
  type SaasNavigationItem,
  type SaasNavigationKind,
} from "./navigation.ts";
import {
  SaasNavigationProvider,
  useSaasNavigation,
} from "./navigation-context.tsx";
import {
  SaasPreferencesProvider,
  useSaasPreferences,
  type SaasPreferencesMode,
} from "./preferences-context.tsx";
import { SAAS_SHELL_MESSAGES_EN, type SaasShellMessages } from "./messages.ts";
import { SAAS_SHELL_VERSION } from "./version.ts";

const ICONS = {
  home: HomeIcon,
  admin: ShieldCheckIcon,
  settings: Settings2Icon,
  app: BoxesIcon,
  chart: ChartBarIcon,
  alpha: CircleGaugeIcon,
  beta: BoxesIcon,
  remote: OrbitIcon,
} satisfies Record<SaasNavigationKind, typeof HomeIcon>;

function subscribeToLocation(): () => void {
  return () => undefined;
}

function getBrowserPath(): string {
  return window.location.pathname;
}

function getServerPath(): string {
  return "/";
}

function SaasMark() {
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
  items: readonly SaasNavigationItem[];
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
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                >
                  <a
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                  >
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
  navigationVisibility,
  children,
  currentAppName,
  currentAppLabel,
  homeHref,
  messages,
  headerActions,
  user,
}: Readonly<{
  canAccessAdmin: boolean;
  navigationVisibility: "all" | "personalized";
  children: ReactNode;
  currentAppName: string;
  currentAppLabel: string;
  homeHref: string;
  messages: SaasShellMessages;
  headerActions?: ReactNode;
  user: Readonly<{ displayName: string; secondaryLabel: string }>;
}>) {
  const navigation = useSaasNavigation();
  const { error, isLoading, isSaving, mode, preferences, updatePreferences } =
    useSaasPreferences();
  const path = useSyncExternalStore(
    subscribeToLocation,
    getBrowserPath,
    getServerPath,
  );
  const visibleNavigation = useMemo(
    () =>
      filterSaasNavigation(navigation, navigationVisibility === "all" ? [] : preferences.hiddenApps, canAccessAdmin),
    [canAccessAdmin, navigation, navigationVisibility, preferences.hiddenApps],
  );
  const platformItems = visibleNavigation.filter(
    (item) => item.section === "platform",
  );
  const appItems = visibleNavigation.filter((item) => item.section === "apps");

  return (
    <TooltipProvider delayDuration={100}>
      <SidebarProvider
        labels={{
          title: messages.sidebar,
          description: messages.sidebarDescription,
          toggle: messages.toggleSidebar,
          close: messages.close,
        }}
        open={!preferences.sidebarCollapsed}
        onOpenChange={(open) => {
          if (open === !preferences.sidebarCollapsed) return;
          void updatePreferences({ sidebarCollapsed: !open }).catch(
            () => undefined,
          );
        }}
        style={
          {
            "--sidebar-width": "var(--saas-sidebar-width)",
            "--sidebar-width-icon": "var(--saas-sidebar-width-collapsed)",
          } as CSSProperties
        }
      >
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader className="border-b border-sidebar-border/70 px-2 py-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="h-12 data-[slot=sidebar-menu-button]:p-2"
                >
                  <a href={homeHref} aria-label={messages.home}>
                    <SaasMark />
                    <span className="grid min-w-0 flex-1 text-left leading-tight">
                      <span className="truncate text-sm font-semibold tracking-[-0.02em]">
                        SAAS
                      </span>
                      <span className="truncate font-mono text-[0.62rem] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                        {messages.unified}
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
                label={messages.workspace}
                path={path}
              />
            ) : null}
            {appItems.length > 0 ? (
              <NavigationGroup
                currentAppName={currentAppName}
                items={appItems}
                label={messages.applications}
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
                        <span className="truncate text-sm font-medium">
                          {user.displayName}
                        </span>
                        <span className="truncate text-xs text-sidebar-foreground/55">
                          {user.secondaryLabel}
                        </span>
                      </span>
                      <ChevronUpIcon className="ml-auto" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="end" className="w-64">
                    <DropdownMenuLabel className="font-normal">
                      <span className="block text-sm font-medium">
                        {user.displayName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {user.secondaryLabel}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onSelect={() =>
                          void updatePreferences({
                            theme:
                              preferences.theme === "dark" ? "light" : "dark",
                          }).catch(() => undefined)
                        }
                      >
                        {preferences.theme === "dark" ? (
                          <SunIcon />
                        ) : (
                          <MoonIcon />
                        )}
                        {preferences.theme === "dark"
                          ? messages.lightTheme
                          : messages.darkTheme}
                      </DropdownMenuItem>
                      {mode === "portal" ? (
                        <DropdownMenuItem asChild>
                          <a href="/settings">
                            <Settings2Icon />
                            {messages.settings}
                          </a>
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="font-mono text-[0.62rem] font-normal uppercase tracking-[0.12em] text-muted-foreground">
                      {messages.shell} {SAAS_SHELL_VERSION}
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
            <span className="truncate text-sm font-medium">
              {currentAppLabel}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {headerActions}
            </div>
            <span className="hidden sm:flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
              <span
                className={`size-1.5 rounded-full ${error ? "bg-destructive" : isLoading || isSaving ? "bg-[var(--saas-warning)]" : "bg-[var(--saas-positive)]"}`}
                aria-hidden="true"
              />
              {error
                ? messages.localState
                : isLoading
                  ? messages.syncing
                  : isSaving
                    ? messages.saving
                    : mode === "local"
                      ? messages.local
                      : messages.synced}
            </span>
          </header>
          <div
            data-slot="saas-content"
            className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(var(--saas-grid)_1px,transparent_1px),linear-gradient(90deg,var(--saas-grid)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_68%)]"
              aria-hidden="true"
            />
            <div className="relative mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

export function SaasShell({
  canAccessAdmin = false,
  navigationVisibility = "personalized",
  children,
  currentAppLabel,
  currentAppName,
  homeHref = "/",
  initialPreferences,
  messages = SAAS_SHELL_MESSAGES_EN,
  headerActions,
  navigation,
  preferencesEndpoint,
  preferencesMode = "portal",
  user,
}: Readonly<{
  canAccessAdmin: boolean;
  navigationVisibility?: "all" | "personalized";
  children: ReactNode;
  currentAppLabel: string;
  currentAppName: string;
  homeHref?: string;
  initialPreferences: SaasPreferences;
  messages?: SaasShellMessages;
  headerActions?: ReactNode;
  navigation: readonly SaasNavigationItem[];
  preferencesEndpoint?: string;
  preferencesMode?: SaasPreferencesMode;
  user: Readonly<{ displayName: string; secondaryLabel: string }>;
}>) {
  return (
    <SaasNavigationProvider navigation={navigation}>
      <SaasPreferencesProvider
        endpoint={preferencesEndpoint}
        initialPreferences={initialPreferences}
        mode={preferencesMode}
      >
        <ShellScaffold
          canAccessAdmin={canAccessAdmin}
          navigationVisibility={navigationVisibility}
          currentAppLabel={currentAppLabel}
          currentAppName={currentAppName}
          homeHref={homeHref}
          messages={messages}
          headerActions={headerActions}
          user={user}
        >
          {children}
        </ShellScaffold>
      </SaasPreferencesProvider>
    </SaasNavigationProvider>
  );
}
