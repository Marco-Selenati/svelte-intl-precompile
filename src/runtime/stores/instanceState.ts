import { writable, derived, readable, Subscriber } from "svelte/store";

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
  addMessages(groupName, ...group);
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

  currentLocale = newLocale;

  if (typeof window !== "undefined") {
    if (newLocale !== "") {
      document.documentElement.setAttribute("lang", newLocale);
    }
  }
}

let currentLocale: string;

export function getCurrentLocale() {
  return currentLocale;
}

let setLocale: null | Subscriber<string> = null;

const $locale = readable("", function start(set) {
  setLocale = set;

  return function stop() {};
});

interface Dictionary {
  [locale: string]: NestedTranslations;
}

let dictionary: Dictionary;
const $dictionary = writable<Dictionary>({});

export function getDictionary() {
  return dictionary;
}

export function getMessageFromDictionary(locale: string, id: string) {
  const d = dictionary[locale];
  if (d !== undefined) {
    const topLocale = d[id];
    if (topLocale !== undefined) {
      return topLocale;
    }

    const idParts = id.split(".");
    let dictionaryLevel = d;
    for (let i = 0; i < idParts.length; i++) {
      const idPart = idParts[i];
      if (idPart === undefined) {
        return undefined;
      }
      const nextLevel = dictionaryLevel[idPart];
      if (nextLevel === undefined) {
        return undefined;
      } else if (
        typeof nextLevel === "string" ||
        typeof nextLevel === "function"
      ) {
        return nextLevel;
      } else {
        dictionaryLevel = nextLevel;
      }
    }
  }
  return undefined;
}

export function addMessages(locale: string, ...partials: NestedTranslations[]) {
  $dictionary.update((d) => {
    let ld = d[locale];
    if (ld === undefined) {
      ld = {};
    }
    d[locale] = Object.assign({}, ld, ...partials);
    return d;
  });
}

const $locales = /*@__PURE__*/ derived([$dictionary], ([$dictionary]) =>
  Object.keys($dictionary)
);
$dictionary.subscribe((newDictionary) => (dictionary = newDictionary));

export { $locale };

export { $dictionary, $locales };
