import { SUPPORTED_LANGUAGES } from "@/i18n";
import { type Theme, useTheme } from "@/lib/theme";
import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

const THEME_ICONS: Record<Theme, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };
const THEME_ORDER: Theme[] = ["light", "dark", "system"];

/** Compact theme cycle button + language select, used in the sidebar. */
export function SettingsControls() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useTheme();

  const cycleTheme = () => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
    setTheme(next);
  };

  const ThemeIcon = THEME_ICONS[theme];

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={cycleTheme}
        title={theme}
        aria-label={`theme: ${theme}`}
        className="grid size-9 place-items-center rounded-full border border-white transition hover:bg-white/25"
      >
        <ThemeIcon className="size-5" />
      </button>

      {/* Language: a little segmented toggle instead of a native <select>. */}
      <div className="flex items-center gap-1.5" aria-label={t("common.language")}>
        <div className="flex rounded-full border border-white p-0.5">
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = i18n.resolvedLanguage === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => i18n.changeLanguage(l.code)}
                aria-pressed={active}
                className={`rounded-full px-2.5 py-1 font-semibold text-xs transition ${
                  active ? "bg-white text-sky" : "text-white hover:bg-white/25"
                }`}
              >
                {l.code.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
