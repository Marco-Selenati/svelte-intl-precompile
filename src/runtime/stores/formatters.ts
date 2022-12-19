import { derived } from "svelte/store";
import {
  MessageFormatter,
  TimeFormatter,
  DateFormatter,
  NumberFormatter,
  JsonGetter,
  TypedFormat,
} from "../types/index";
import { lookup } from "../includes/lookup";
import {
  getTimeFormatter,
  getDateFormatter,
  getNumberFormatter,
} from "../includes/formatters";
import { getCurrentLocale } from "../includes/utils";
import { $dictionary } from "./dictionary";
import { $locale } from "./locale";

export const formatMessage: MessageFormatter = (
  currentLocale,
  optionsOrId,
  maybeOptions = {}
) => {
  const id = typeof optionsOrId === "string" ? optionsOrId : optionsOrId.id;
  const options = typeof optionsOrId === "string" ? maybeOptions : optionsOrId;

  const {
    values,
    locale = currentLocale || getCurrentLocale(),
    default: defaultValue,
  } = options;

  if (locale == null) {
    throw new Error(
      "[svelte-intl-precompile] Cannot format a message without first setting the initial locale."
    );
  }

  let message = lookup(id, locale);

  if (typeof message === "string") {
    return message;
  } else if (typeof message === "function") {
    return message(
      ...Object.keys(values || {})
        .sort()
        .map((k) => (values || {})[k])
    );
  }

  return defaultValue || id;
};

export const getJSON: JsonGetter = (id, locale) => {
  locale = locale || getCurrentLocale();
  return lookup(id, locale) || id;
};

export const formatTime: TimeFormatter = (currentLocale, t, options) => {
  const locale = currentLocale || getCurrentLocale();
  return getTimeFormatter({ locale, ...options }).format(t);
};

export const formatDate: DateFormatter = (currentLocale, d, options) => {
  const locale = currentLocale || getCurrentLocale();
  return getDateFormatter({ locale, ...options }).format(d);
};

export const formatNumber: NumberFormatter = (currentLocale, n, options) => {
  const locale = currentLocale || getCurrentLocale();
  return getNumberFormatter({ locale, ...options }).format(n);
};

export const $format: TypedFormat = /*@__PURE__*/ derived(
  [$locale, $dictionary],
  ([currentLocale]) => formatMessage.bind(null, currentLocale)
);
export const $formatTime = /*@__PURE__*/ derived([$locale], ([currentLocale]) =>
  formatTime.bind(null, currentLocale)
);
export const $formatDate = /*@__PURE__*/ derived([$locale], ([currentLocale]) =>
  formatDate.bind(null, currentLocale)
);
export const $formatNumber = /*@__PURE__*/ derived(
  [$locale],
  ([currentLocale]) => formatNumber.bind(null, currentLocale)
);
export const $getJSON = /*@__PURE__*/ derived(
  [$locale, $dictionary],
  () => getJSON
);
