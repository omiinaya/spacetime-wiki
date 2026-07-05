import React from "react";
import { useTranslation } from "react-i18next";
import { setLanguage, getSupportedLanguages } from "../i18n/config";
import { Languages } from "lucide-react";

interface LanguageSwitcherProps {
  /** Optional compact mode for sidebar placement */
  compact?: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language?.slice(0, 2) || "en";
  const supported = getSupportedLanguages();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Languages className="h-3.5 w-3.5 text-muted-foreground" />
        <select
          value={currentLang}
          onChange={handleChange}
          aria-label={t("admin.language_label")}
          className="bg-transparent text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-primary/50 cursor-pointer"
        >
          {supported.map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code] || code}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
        <Languages className="h-3 w-3" />
        {t("admin.language_label")}
      </label>
      <select
        value={currentLang}
        onChange={handleChange}
        aria-label={t("admin.language_label")}
        className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50 cursor-pointer"
      >
        {supported.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_LABELS[code] || code}
          </option>
        ))}
      </select>
    </div>
  );
}
