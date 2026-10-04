"use client";
import { MoonIcon, SunIcon, LanguagesIcon } from "lucide-react";
import { Button } from "@saas-platform/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@saas-platform/ui/components/dropdown-menu";
import { SAAS_LOCALE_COOKIE, type SaasLocale } from "@saas-platform/theme";
import { useSaasPreferences } from "./preferences-context.tsx";
import { getSaasShellMessages } from "./messages.ts";
export function SaasPresentationControls({ locale }: { locale: SaasLocale }) {
  const { preferences, updatePreferences } = useSaasPreferences(),
    messages = getSaasShellMessages(locale);
  function language(value: SaasLocale) {
    document.cookie = `${SAAS_LOCALE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    location.reload();
  }
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={
          preferences.theme === "dark"
            ? messages.lightTheme
            : messages.darkTheme
        }
        title={
          preferences.theme === "dark"
            ? messages.lightTheme
            : messages.darkTheme
        }
        onClick={() =>
          void updatePreferences({
            theme: preferences.theme === "dark" ? "light" : "dark",
          }).catch(() => {})
        }
      >
        {preferences.theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" aria-label={messages.language}>
            <LanguagesIcon data-icon="inline-start" />
            {locale === "zh" ? messages.chinese : messages.english}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => language("zh")}>
              {messages.chinese}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => language("en")}>
              {messages.english}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
