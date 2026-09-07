export const FRAME_THEME_STORAGE_KEY = "frame:theme";
export const FRAME_SIDEBAR_STORAGE_KEY = "frame:sidebar-collapsed";
export const FRAME_PREFERENCES_EVENT = "frame:preferences-changed";
export const FRAME_PREFERENCES_STORAGE_KEY = "frame:preferences-v1";

export const FRAME_THEME_COOKIE = "frame-theme";
export const FRAME_SIDEBAR_COOKIE = "frame-sidebar-collapsed";

export const FRAME_THEME_VALUES = ["light", "dark"] as const;
export type FrameTheme = (typeof FRAME_THEME_VALUES)[number];

export type FramePreferences = Readonly<{
  theme: FrameTheme;
  sidebarCollapsed: boolean;
  hiddenApps: readonly string[];
  updatedAt: string | null;
}>;

export const DEFAULT_FRAME_PREFERENCES: FramePreferences = Object.freeze({
  theme: "light",
  sidebarCollapsed: false,
  hiddenApps: Object.freeze([]),
  updatedAt: null,
});

export function isFrameTheme(value: unknown): value is FrameTheme {
  return typeof value === "string" && FRAME_THEME_VALUES.includes(value as FrameTheme);
}

export function createInitialFramePreferences(
  themeValue: string | undefined,
  sidebarCollapsedValue: string | undefined,
): FramePreferences {
  return {
    ...DEFAULT_FRAME_PREFERENCES,
    theme: isFrameTheme(themeValue) ? themeValue : DEFAULT_FRAME_PREFERENCES.theme,
    sidebarCollapsed: sidebarCollapsedValue === "true",
  };
}
