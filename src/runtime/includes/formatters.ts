import { getCurrentLocale } from "../stores/instanceState";

const defaultNumber: Record<string, Intl.NumberFormatOptions> = {
  scientific: { notation: "scientific" },
  engineering: { notation: "engineering" },
  compactLong: { notation: "compact", compactDisplay: "long" },
  compactShort: { notation: "compact", compactDisplay: "short" },
};

const defaultDate: Record<string, Intl.DateTimeFormatOptions> = {
  short: { month: "numeric", day: "numeric", year: "2-digit" },
  medium: { month: "short", day: "numeric", year: "numeric" },
  long: { month: "long", day: "numeric", year: "numeric" },
  full: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
};

const defaultTime: Record<string, Intl.DateTimeFormatOptions> = {
  short: { hour: "numeric", minute: "numeric" },
  medium: { hour: "numeric", minute: "numeric", second: "numeric" },
  long: {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
  },
  full: {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
  },
};

export const setCustomNumberFormat = (
  f: Record<string, Intl.NumberFormatOptions>
) => {
  customNumber = f;
};

export const setCustomDateFormat = (
  f: Record<string, Intl.DateTimeFormatOptions>
) => {
  customDate = f;
};

export const setCustomTimeFormat = (
  f: Record<string, Intl.DateTimeFormatOptions>
) => {
  customTime = f;
};

let customNumber: Record<string, Intl.NumberFormatOptions> = {};
let customDate: Record<string, Intl.DateTimeFormatOptions> = {};
let customTime: Record<string, Intl.DateTimeFormatOptions> = {};

export const getNumberFormatter = (
  locale: string,
  format: string | Intl.NumberFormatOptions | undefined
) => {
  locale = locale || getCurrentLocale();
  if (locale == null) {
    throw new Error(
      '[precompile-intl-runtime] A "locale" must be set to format numbers'
    );
  }

  const formats = Object.assign({}, defaultNumber, customNumber);

  if (typeof format === "string") {
    format = formats[format];
  }

  if (format === undefined) {
    format = formats["short"];
  }

  return new Intl.NumberFormat(locale, format);
};

export const getDateFormatter = (
  locale: string,
  format: string | Intl.DateTimeFormatOptions | undefined
) => {
  locale = locale || getCurrentLocale();
  if (locale == null) {
    throw new Error(
      '[precompile-intl-runtime] A "locale" must be set to format dates'
    );
  }

  const formats = Object.assign({}, defaultDate, customDate);

  if (typeof format === "string") {
    format = formats[format];
  }

  if (format === undefined) {
    format = formats["short"];
  }

  return new Intl.DateTimeFormat(locale, format);
};

export const getTimeFormatter = (
  locale: string,
  format: string | Intl.DateTimeFormatOptions | undefined
) => {
  locale = locale || getCurrentLocale();
  if (locale == null) {
    throw new Error(
      '[precompile-intl-runtime] A "locale" must be set to format time values'
    );
  }

  const formats = Object.assign({}, defaultTime, customTime);

  if (typeof format === "string") {
    format = formats[format];
  }

  if (format === undefined) {
    format = formats["short"];
  }

  return new Intl.DateTimeFormat(locale, format);
};
