import en from "./locales/en.js";
import zh from "./locales/zh.js";
import vi from "./locales/vi.js";
import ko from "./locales/ko.js";

export const SUPPORTED_LOCALES = ["en", "zh", "vi", "ko"];

export const LOCALE_META = {
  en: { label: "English", short: "EN", htmlLang: "en" },
  zh: { label: "简体中文", short: "中文", htmlLang: "zh-CN" },
  vi: { label: "Tiếng Việt", short: "VI", htmlLang: "vi" },
  ko: { label: "한국어", short: "한국어", htmlLang: "ko" },
};

export const UI = { en, zh, vi, ko };

export function normalizeLocale(value) {
  if (!value) return "en";
  const lowered = String(value).toLowerCase();
  if (lowered.startsWith("zh")) return "zh";
  if (lowered.startsWith("vi")) return "vi";
  if (lowered.startsWith("ko")) return "ko";
  return "en";
}

export function t(locale, key, values = {}) {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : "en";
  const template = UI[safeLocale]?.[key] ?? UI.en[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, token) => String(values[token] ?? `{${token}}`));
}

export function localized(value, locale) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value.en ?? Object.values(value)[0] ?? "";
}
