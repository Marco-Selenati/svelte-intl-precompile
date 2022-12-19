import { getCurrentLocale, setCurrentLocale } from "../includes/utils";
import { writable, derived, readable, Subscriber } from "svelte/store";
import type {
  LocaleDictionary,
  Dictionary,
  LocaleDictionaryValue,
} from "../types/index";

export type NestedTranslations =
  | string
  | Function
  | { [Key: string]: NestedTranslations };

export interface MessagesLoader {
  (): Promise<{ default: NestedTranslations }>;
}

const registeredLocaleGroups: Record<string, MessagesLoader[]> = {};

// Wait for the specified localeGroup to be ready to be rendered
export async function flush(groupName: string): Promise<void> {
  const localeGroup = registeredLocaleGroups[groupName];
  if (localeGroup === undefined) {
    return;
  }
  const promises = localeGroup.map((lg) => lg());
  const group = await Promise.all(promises);
  addMessages(groupName, ...group.map((g) => g.default));
}

// Add a localeGroup with a function that resolves to the translations
export function register(groupName: string, loader: MessagesLoader[]) {
  registeredLocaleGroups[groupName] = loader;
}

export async function changeLocale(newLocale: string) {
  await flush(newLocale);

  if (setLocale !== null) {
    setLocale(newLocale);
  }

  setCurrentLocale(newLocale);

  if (typeof window !== "undefined") {
    if (newLocale !== "") {
      document.documentElement.setAttribute("lang", newLocale);
    }
  }
}

let setLocale: null | Subscriber<string> = null;

const $locale = readable("", function start(set) {
  setLocale = set;

  return function stop() {};
});

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

export function addMessages(locale: string, ...partials: NestedTranslations[]) {
  $dictionary.update((d) => {
    d[locale] = Object.assign(d[locale] ?? {}, ...partials);
    return d;
  });
}

const $locales = /*@__PURE__*/ derived([$dictionary], ([$dictionary]) =>
  Object.keys($dictionary)
);
$dictionary.subscribe((newDictionary) => (dictionary = newDictionary));

export { $locale };

export { $dictionary, $locales };
