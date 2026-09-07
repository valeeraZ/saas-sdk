"use client";

import {
  DEFAULT_FRAME_PREFERENCES,
  FRAME_PREFERENCES_EVENT,
  FRAME_PREFERENCES_STORAGE_KEY,
  FRAME_SIDEBAR_COOKIE,
  FRAME_SIDEBAR_STORAGE_KEY,
  FRAME_THEME_COOKIE,
  FRAME_THEME_STORAGE_KEY,
  isFrameTheme,
  type FramePreferences,
} from "@frame/theme";
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
  theme?: FramePreferences["theme"];
  sidebarCollapsed?: boolean;
  hiddenApps?: readonly string[];
}>;

export type FramePreferencesMode = "local" | "portal";

type FramePreferencesContextValue = Readonly<{
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  mode: FramePreferencesMode;
  preferences: FramePreferences;
  updatePreferences: (patch: PreferencePatch) => Promise<void>;
}>;

const FramePreferencesContext = createContext<FramePreferencesContextValue | null>(null);

function normalizePreferences(value: unknown): FramePreferences | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!isFrameTheme(candidate.theme) || typeof candidate.sidebarCollapsed !== "boolean") {
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

function applyBrowserPreferences(preferences: FramePreferences): void {
  document.documentElement.classList.toggle("dark", preferences.theme === "dark");
  document.documentElement.dataset.theme = preferences.theme;
  document.cookie = `${FRAME_THEME_COOKIE}=${preferences.theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.cookie = `${FRAME_SIDEBAR_COOKIE}=${String(preferences.sidebarCollapsed)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  localStorage.setItem(FRAME_THEME_STORAGE_KEY, preferences.theme);
  localStorage.setItem(FRAME_SIDEBAR_STORAGE_KEY, String(preferences.sidebarCollapsed));
  localStorage.setItem(FRAME_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

function mergePreferences(
  current: FramePreferences,
  patch: PreferencePatch,
): FramePreferences {
  return {
    theme: patch.theme ?? current.theme,
    sidebarCollapsed: patch.sidebarCollapsed ?? current.sidebarCollapsed,
    hiddenApps: patch.hiddenApps ? [...patch.hiddenApps] : current.hiddenApps,
    updatedAt: current.updatedAt,
  };
}

export function FramePreferencesProvider({
  children,
  endpoint = "/api/frame/me/preferences",
  initialPreferences = DEFAULT_FRAME_PREFERENCES,
  mode = "portal",
}: Readonly<{
  children: ReactNode;
  endpoint?: string;
  initialPreferences?: FramePreferences;
  mode?: FramePreferencesMode;
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
        const stored = localStorage.getItem(FRAME_PREFERENCES_STORAGE_KEY);
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
      if (event.key !== FRAME_PREFERENCES_STORAGE_KEY || !event.newValue) return;
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
        window.dispatchEvent(new CustomEvent(FRAME_PREFERENCES_EVENT, { detail: saved }));
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
          window.dispatchEvent(new CustomEvent(FRAME_PREFERENCES_EVENT, { detail: saved }));
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

  const value = useMemo<FramePreferencesContextValue>(
    () => ({ error, isLoading, isSaving, mode, preferences, updatePreferences }),
    [error, isLoading, isSaving, mode, preferences, updatePreferences],
  );

  return <FramePreferencesContext.Provider value={value}>{children}</FramePreferencesContext.Provider>;
}

export function useFramePreferences(): FramePreferencesContextValue {
  const value = useContext(FramePreferencesContext);
  if (!value) throw new Error("useFramePreferences must be used inside FramePreferencesProvider");
  return value;
}
