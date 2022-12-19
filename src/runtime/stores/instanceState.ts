import { flush, hasLocaleQueue } from "../includes/loaderQueue";
import { getCurrentLocale, setCurrentLocale } from "../includes/utils";
import { writable, derived } from "svelte/store";
import type {
  LocaleDictionary,
  DeepDictionary,
  Dictionary,
  LocaleDictionaryValue,
} from "../types/index";
import { getPossibleLocales } from "../includes/utils";

const $locale = writable("");

$locale.subscribe((newLocale: string) => {
  setCurrentLocale(newLocale);

  if (typeof window !== "undefined") {
    if (newLocale !== "") {
      document.documentElement.setAttribute("lang", newLocale);
    }
  }
});

const localeSet = $locale.set;
$locale.set = (newLocale: string): void | Promise<void> => {
  if (getClosestAvailableLocale(newLocale) && hasLocaleQueue(newLocale)) {
    return flush(newLocale).then(() => localeSet(newLocale));
  }
  return localeSet(newLocale);
};

// istanbul ignore next
$locale.update = (fn: (locale: string) => void) => {
  let currentLocale = getCurrentLocale();
  fn(currentLocale);
  localeSet(currentLocale);
};

let dictionary: Dictionary;
const $dictionary = writable<Dictionary>({});

export function getLocaleDictionary(locale: string) {
  return (dictionary[locale] as LocaleDictionary) || null;
}

export function getDictionary() {
  return dictionary;
}

export function hasLocaleDictionary(locale: string) {
  return locale in dictionary;
}

export function getMessageFromDictionary(locale: string, id: string) {
  if (hasLocaleDictionary(locale)) {
    const localeDictionary = getLocaleDictionary(locale);
    if (id in localeDictionary) {
      return localeDictionary[id];
    }

    const ids = id.split(".");
    let tmpDict: any = localeDictionary;
    for (let i = 0; i < ids.length; i++) {
      const idPart = ids[i];
      if (idPart === undefined) {
        return null;
      }
      if (typeof tmpDict[idPart] !== "object") {
        return (tmpDict[idPart] as LocaleDictionaryValue) || null;
      }
      tmpDict = tmpDict[idPart];
    }
  }
  return null;
}

export function getClosestAvailableLocale(refLocale: string): string | null {
  if (refLocale == null) return null;

  const relatedLocales = getPossibleLocales(refLocale);

  for (let i = 0; i < relatedLocales.length; i++) {
    const locale = relatedLocales[i];
    if (locale === undefined) {
      return null;
    }

    if (hasLocaleDictionary(locale)) {
      return locale;
    }
  }

  return null;
}

export function addMessages(locale: string, ...partials: DeepDictionary[]) {
  $dictionary.update((d) => {
    d[locale] = Object.assign(d[locale] ?? {}, ...partials);
    return d;
  });
}

const $locales = /*@__PURE__*/ derived([$dictionary], ([$dictionary]) =>
  Object.keys($dictionary)
);
$dictionary.subscribe((newDictionary) => (dictionary = newDictionary));

export const $isLoading = writable(false);

export { $locale };

export { $dictionary, $locales };
