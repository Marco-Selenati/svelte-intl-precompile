import type { MessagesLoader } from "../types/index";
import {
  hasLocaleDictionary,
  $dictionary,
  addMessages,
} from "../stores/instanceState.js";
import { getPossibleLocales, getOptions } from "../includes/utils";
import { $isLoading } from "../stores/instanceState.js";

type Queue = Set<MessagesLoader>;
const loaderQueue: Record<string, Queue> = {};

function removeLocaleFromQueue(locale: string) {
  delete loaderQueue[locale];
}

function getLocaleQueue(locale: string) {
  return loaderQueue[locale];
}

function getLocalesQueues(locale: string) {
  return getPossibleLocales(locale)
    .reverse()
    .map<[string, MessagesLoader[]]>((localeItem) => {
      const queue = getLocaleQueue(localeItem);
      return [localeItem, queue ? [...queue] : []];
    })
    .filter(([, queue]) => queue.length > 0);
}

export function hasLocaleQueue(locale: string) {
  return getPossibleLocales(locale).reverse().some(getLocaleQueue);
}

const activeLocaleFlushes: { [key: string]: Promise<void> } = {};

// Wait for the specified locale to be ready to be rendered
export function flush(locale: string) {
  if (!hasLocaleQueue(locale)) return Promise.resolve();
  if (locale in activeLocaleFlushes) return activeLocaleFlushes[locale];

  // get queue of XX-YY and XX locales
  const queues = getLocalesQueues(locale);
  // istanbul ignore if
  if (queues.length === 0) return Promise.resolve();

  const loadingDelay = setTimeout(
    () => $isLoading.set(true),
    getOptions().loadingDelay
  );

  // TODO what happens if some loader fails
  activeLocaleFlushes[locale] = Promise.all(
    queues.map(([locale, queue]) => {
      return Promise.all(queue.map((loader) => loader())).then((partials) => {
        removeLocaleFromQueue(locale);
        partials = partials.map((partial) => partial.default || partial);
        addMessages(locale, ...partials);
      });
    })
  ).then(() => {
    clearTimeout(loadingDelay);
    $isLoading.set(false);
    delete activeLocaleFlushes[locale];
  });

  return activeLocaleFlushes[locale];
}

// Add a locale with a function that resolves to the translations
export function register(locale: string, loader: MessagesLoader) {
  let queue = getLocaleQueue(locale);

  if (queue === undefined) {
    queue = new Set();
    loaderQueue[locale] = queue;
  } else if (queue.has(loader)) {
    return;
  }

  if (!hasLocaleDictionary(locale)) {
    $dictionary.update((d) => {
      d[locale] = {};
      return d;
    });
  }

  queue.add(loader);
}
