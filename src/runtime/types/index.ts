import type { Readable } from "svelte/store";

export interface MessageObject {
  locale?: string;
  format?: string;
  default?: string;
  values?: Record<string, string | number | Date>;
}

export interface MessageObjectWithId<T = string> extends MessageObject {
  id: T;
}

export type JsonGetter = (id: string, locale?: string) => any;

export type MessageFormatter<T = string> = (
  currentLocale: string,
  id: T | MessageObjectWithId<T>,
  options?: MessageObject
) => string;

export type TimeFormatter = (
  currentLocale: string,
  d: Date | number,
  options: string | Intl.DateTimeFormatOptions | undefined
) => string;

export type DateFormatter = (
  currentLocale: string,
  d: Date | number,
  options: string | Intl.DateTimeFormatOptions | undefined
) => string;

export type NumberFormatter = (
  currentLocale: string,
  d: number,
  options: string | Intl.NumberFormatOptions | undefined
) => string;

export type IntlFormatterOptions<T> = T & {
  format?: string;
  locale?: string;
};

export type TypedFormat<T = string> = Readable<
  (
    id: T | MessageObjectWithId<T>,
    options?: MessageObject | undefined
  ) => string
>;
