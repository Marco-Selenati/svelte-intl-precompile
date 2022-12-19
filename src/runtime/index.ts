import { getCurrentLocale } from "./includes/utils.js";
export * from "./includes/localeGetters.js";
export * from "./includes/utils.js";
export { $locale as locale } from "./stores/instanceState.js";
export {
  $dictionary as dictionary,
  $locales as locales,
  addMessages,
} from "./stores/instanceState.js";
export { register, changeLocale } from "./stores/instanceState.js";
import { formatTime, formatDate, formatNumber } from "./stores/formatters.js";
import type { IntlFormatterOptions } from "./types";
export {
  formatMessage,
  $format as __t,
  $formatDate as date,
  $formatNumber as number,
  $formatTime as time,
  $getJSON as json,
} from "./stores/formatters.js";
export {
  getDateFormatter,
  getNumberFormatter,
  getTimeFormatter,
  setCustomDateFormat,
  setCustomNumberFormat,
  setCustomTimeFormat,
} from "./includes/formatters.js";

type PluralRule = "z" | "o" | "t" | "f" | "m" | "h" | number;
export type PluralOptions = Partial<Record<PluralRule, string>>;
export function __interpolate(value: any) {
  return value === 0 ? 0 : value || "";
}

const PLURAL_RULES: Record<string, Intl.PluralRules> = {};
function getLocalPluralFor(v: number): PluralRule {
  let loc = getCurrentLocale();
  let pluralRules =
    PLURAL_RULES[loc] || (PLURAL_RULES[loc] = new Intl.PluralRules(loc));
  let key = pluralRules.select(v);
  return key === "other" ? "h" : (key[0] as PluralRule);
}
export function __offsetPlural(
  value: number,
  offset: number,
  opts: PluralOptions
): string {
  return opts[value] || opts[getLocalPluralFor(value - offset)] || "";
}

export function __plural(value: number, opts: PluralOptions): string {
  return opts[value] || opts[getLocalPluralFor(value)] || "";
}

export function __select(value: any, opts: Record<any, string>): string {
  return opts[value] || opts["other"] || "";
}

export function __number(
  value: number,
  format?: string | IntlFormatterOptions<Intl.NumberFormatOptions>
): string {
  return formatNumber(getCurrentLocale(), value, format);
}

export function __date(value: Date, format?: string): string {
  return formatDate(getCurrentLocale(), value, format);
}

export function __time(value: Date, format?: string): string {
  return formatTime(getCurrentLocale(), value, format);
}

export type { TypedFormat } from "./types/index.js";
