export const SAAS_THEME_STORAGE_KEY = "saas:theme";
export const SAAS_SIDEBAR_STORAGE_KEY = "saas:sidebar-collapsed";
export const SAAS_PREFERENCES_EVENT = "saas:preferences-changed";
export const SAAS_PREFERENCES_STORAGE_KEY = "saas:preferences-v1";

export const SAAS_THEME_COOKIE = "saas-theme";
export const SAAS_SIDEBAR_COOKIE = "saas-sidebar-collapsed";

export const SAAS_THEME_VALUES = ["light", "dark"] as const;
export type SaasTheme = (typeof SAAS_THEME_VALUES)[number];

export type SaasPreferences = Readonly<{
  theme: SaasTheme;
  sidebarCollapsed: boolean;
  hiddenApps: readonly string[];
  updatedAt: string | null;
}>;

export const DEFAULT_SAAS_PREFERENCES: SaasPreferences = Object.freeze({
  theme: "light",
  sidebarCollapsed: false,
  hiddenApps: Object.freeze([]),
  updatedAt: null,
});

export function isSaasTheme(value: unknown): value is SaasTheme {
  return (
    typeof value === "string" && SAAS_THEME_VALUES.includes(value as SaasTheme)
  );
}

export function createInitialSaasPreferences(
  themeValue: string | undefined,
  sidebarCollapsedValue: string | undefined,
): SaasPreferences {
  return {
    ...DEFAULT_SAAS_PREFERENCES,
    theme: isSaasTheme(themeValue)
      ? themeValue
      : DEFAULT_SAAS_PREFERENCES.theme,
    sidebarCollapsed: sidebarCollapsedValue === "true",
  };
}

/** Presentation only: these values never grant identity or authorization. */
export const SAAS_LOCALE_COOKIE = "saas-locale";
export type SaasLocale = "zh" | "en";
export type SaasPresentation = Readonly<{
  theme: SaasTheme;
  sidebarCollapsed: boolean;
  locale: SaasLocale;
}>;
export function createSaasPresentation(value: unknown = {}): SaasPresentation {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    theme: isSaasTheme(input.theme) ? input.theme : "light",
    sidebarCollapsed: input.sidebarCollapsed === true,
    locale: input.locale === "en" ? "en" : "zh",
  };
}
