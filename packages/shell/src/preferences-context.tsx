"use client";

import {
  DEFAULT_SAAS_PREFERENCES,
  SAAS_PREFERENCES_EVENT,
  SAAS_PREFERENCES_STORAGE_KEY,
  SAAS_SIDEBAR_COOKIE,
  SAAS_SIDEBAR_STORAGE_KEY,
  SAAS_THEME_COOKIE,
  SAAS_THEME_STORAGE_KEY,
  isSaasTheme,
  type SaasPreferences,
} from "@saas-platform/theme";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PreferencePatch = Readonly<{
  theme?: SaasPreferences["theme"];
  sidebarCollapsed?: boolean;
  hiddenApps?: readonly string[];
}>;

export type SaasPreferencesMode = "local" | "portal";

type SaasPreferencesContextValue = Readonly<{
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  mode: SaasPreferencesMode;
  preferences: SaasPreferences;
  updatePreferences: (patch: PreferencePatch) => Promise<void>;
}>;

const SaasPreferencesContext = createContext<SaasPreferencesContextValue | null>(null);

function normalizePreferences(value: unknown): SaasPreferences | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!isSaasTheme(candidate.theme) || typeof candidate.sidebarCollapsed !== "boolean") {
    return null;
  }
  if (
    !Array.isArray(candidate.hiddenApps) ||
    !candidate.hiddenApps.every((appName) => typeof appName === "string")
  ) {
    return null;
  }
  return {
    theme: candidate.theme,
    sidebarCollapsed: candidate.sidebarCollapsed,
    hiddenApps: candidate.hiddenApps,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : null,
  };
}

function applyBrowserPreferences(preferences: SaasPreferences): void {
  document.documentElement.classList.toggle("dark", preferences.theme === "dark");
  document.documentElement.dataset.theme = preferences.theme;
  document.cookie = `${SAAS_THEME_COOKIE}=${preferences.theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.cookie = `${SAAS_SIDEBAR_COOKIE}=${String(preferences.sidebarCollapsed)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  localStorage.setItem(SAAS_THEME_STORAGE_KEY, preferences.theme);
  localStorage.setItem(SAAS_SIDEBAR_STORAGE_KEY, String(preferences.sidebarCollapsed));
  localStorage.setItem(SAAS_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

function mergePreferences(
  current: SaasPreferences,
  patch: PreferencePatch,
): SaasPreferences {
  return {
    theme: patch.theme ?? current.theme,
    sidebarCollapsed: patch.sidebarCollapsed ?? current.sidebarCollapsed,
    hiddenApps: patch.hiddenApps ? [...patch.hiddenApps] : current.hiddenApps,
    updatedAt: current.updatedAt,
  };
}

export function SaasPreferencesProvider({
  children,
  endpoint = "/api/saas/me/preferences",
  initialPreferences = DEFAULT_SAAS_PREFERENCES,
  mode = "portal",
}: Readonly<{
  children: ReactNode;
  endpoint?: string;
  initialPreferences?: SaasPreferences;
  mode?: SaasPreferencesMode;
}>) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isLoading, setIsLoading] = useState(mode === "portal");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestPreferences = useRef(preferences);
  const localPreferencesReady = useRef(mode === "portal");
  const updateQueue = useRef(Promise.resolve());

  useEffect(() => {
    if (!localPreferencesReady.current) return;
    latestPreferences.current = preferences;
    applyBrowserPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (mode === "local") {
      try {
        const stored = localStorage.getItem(SAAS_PREFERENCES_STORAGE_KEY);
        const localPreferences = stored
          ? normalizePreferences(JSON.parse(stored))
          : null;
        if (localPreferences) {
          latestPreferences.current = localPreferences;
          startTransition(() => setPreferences(localPreferences));
        }
      } catch {
        // Ignore malformed local data and retain Cookie-derived preferences.
      }
      localPreferencesReady.current = true;
      applyBrowserPreferences(latestPreferences.current);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    async function loadPreferences() {
      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Preferences request failed (${response.status})`);
        const nextPreferences = normalizePreferences(await response.json());
        if (!nextPreferences) throw new Error("Preferences response is invalid");
        startTransition(() => {
          setPreferences(nextPreferences);
          setError(null);
        });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Preferences are unavailable");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadPreferences();
    return () => controller.abort();
  }, [endpoint, mode]);

  useEffect(() => {
    function synchronize(event: StorageEvent) {
      if (event.key !== SAAS_PREFERENCES_STORAGE_KEY || !event.newValue) return;
      try {
        const synchronized = normalizePreferences(JSON.parse(event.newValue));
        if (synchronized) setPreferences(synchronized);
      } catch {
        // Ignore malformed data written by older clients.
      }
    }
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);

  const updatePreferences = useCallback(
    async (patch: PreferencePatch) => {
      const previous = latestPreferences.current;
      const optimistic = mergePreferences(previous, patch);

      if (mode === "local") {
        const saved = {
          ...optimistic,
          updatedAt: new Date().toISOString(),
        };
        latestPreferences.current = saved;
        setPreferences(saved);
        setError(null);
        window.dispatchEvent(new CustomEvent(SAAS_PREFERENCES_EVENT, { detail: saved }));
        return;
      }

      latestPreferences.current = optimistic;
      setPreferences(optimistic);
      setIsSaving(true);
      setError(null);

      const task = async () => {
        try {
          const response = await fetch(endpoint, {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(patch),
          });
          if (!response.ok) throw new Error(`Preference update failed (${response.status})`);
          const saved = normalizePreferences(await response.json());
          if (!saved) throw new Error("Preference update response is invalid");
          latestPreferences.current = saved;
          setPreferences(saved);
          window.dispatchEvent(new CustomEvent(SAAS_PREFERENCES_EVENT, { detail: saved }));
        } catch (saveError) {
          latestPreferences.current = previous;
          setPreferences(previous);
          setError(saveError instanceof Error ? saveError.message : "Preference update failed");
          throw saveError;
        } finally {
          setIsSaving(false);
        }
      };

      const queued = updateQueue.current.then(task, task);
      updateQueue.current = queued.catch(() => undefined);
      return queued;
    },
    [endpoint, mode],
  );

  const value = useMemo<SaasPreferencesContextValue>(
    () => ({ error, isLoading, isSaving, mode, preferences, updatePreferences }),
    [error, isLoading, isSaving, mode, preferences, updatePreferences],
  );

  return <SaasPreferencesContext.Provider value={value}>{children}</SaasPreferencesContext.Provider>;
}

export function useSaasPreferences(): SaasPreferencesContextValue {
  const value = useContext(SaasPreferencesContext);
  if (!value) throw new Error("useSaasPreferences must be used inside SaasPreferencesProvider");
  return value;
}
