import { getMessageFromDictionary } from "../stores/instanceState.js";
import { getPossibleLocales } from "./utils.js";

export const lookup = (path: string, refLocale: string) => {
  if (refLocale == null) return undefined;

  const locales = getPossibleLocales(refLocale);

  for (let i = 0; i < locales.length; i++) {
    const locale = locales[i];
    if (locale === undefined) {
      continue;
    }
    const message = getMessageFromDictionary(locale, path);

    if (message) {
      return message;
    }
  }

  return undefined;
};
