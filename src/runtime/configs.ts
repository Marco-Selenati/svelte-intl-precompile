import type { ConfigureOptions } from "./types/index.js";
import { $locale } from "./stores/instanceState.js";
import { getOptions } from "./includes/utils.js";

export function init(opts: ConfigureOptions) {
  const initialLocale = opts.initialLocale || opts.fallbackLocale;
  const options = getOptions();
  Object.assign(options, opts, { initialLocale });

  return $locale.set(initialLocale);
}
