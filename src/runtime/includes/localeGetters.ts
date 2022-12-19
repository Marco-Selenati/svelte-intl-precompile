const getFirstMatch = (base: string, pattern: RegExp) => {
  const match = pattern.exec(base);

  if (!match) return null;

  return match[1] || null;
};

export const getLocaleFromHostname = (hostname: RegExp) => {
  if (typeof window === "undefined") return null;

  return getFirstMatch(window.location.hostname, hostname);
};

export const getLocaleFromPathname = (pathname: RegExp) => {
  if (typeof window === "undefined") return null;

  return getFirstMatch(window.location.pathname, pathname);
};

export const getLocaleFromNavigator = (ssrDefault?: string) => {
  if (typeof window === "undefined") {
    return ssrDefault || null;
  }

  return window.navigator.language || window.navigator.languages[0];
};

export const getLocaleFromAcceptLanguageHeader = (
  header: string | null,
  availableLocales?: string[]
): string | undefined => {
  // If header is null (i.e. does not exist) the fallbackLocale should be used
  if (!header) return undefined;

  // Parse Accept-Language header
  const locales = header
    .split(",")
    .map((locale) => locale.trim())
    .flatMap((locale) => {
      const directives = locale.split(";q=");
      const l = directives[0];
      const quality = directives[1];
      if (l !== undefined) {
        let q = 1.0;
        if (quality !== undefined) {
          q = parseFloat(quality);
        }
        return [
          {
            locale: l,
            quality: q,
          },
        ];
      } else {
        return [];
      }
    })
    .sort((a, b) => b.quality - a.quality);

  // If availableLocales is not defined return the first language from header
  if (!availableLocales || availableLocales.length === 0)
    return locales[0]?.locale;

  locales.forEach((l) => (l.locale = l.locale.toLowerCase()));

  let firstAvailableBaseMatch: { match: string; base: string } | undefined;

  // Check languages
  for (const locale of locales) {
    if (
      firstAvailableBaseMatch &&
      !locale.locale
        .toLowerCase()
        .startsWith(`${firstAvailableBaseMatch.base}-`)
    ) {
      continue;
    }

    // Full match
    const fullMatch = getArrayElementCaseInsensitive(
      availableLocales,
      locale.locale
    );
    if (fullMatch) {
      return fullMatch;
    }

    if (firstAvailableBaseMatch) {
      continue;
    }

    const se = locale.locale.split("-")[0];

    // header base match
    if (se !== undefined) {
      const baseMatch = getArrayElementCaseInsensitive(availableLocales, se);

      if (baseMatch) {
        return baseMatch;
      }
    }

    // available base match
    for (const availableLocale of availableLocales) {
      const availableBase = availableLocale.split("-")[0];
      if (
        availableBase !== undefined &&
        availableBase.toLowerCase() === locale.locale
      ) {
        // Remember base match to check if full match with same base exists
        firstAvailableBaseMatch = {
          match: availableLocale,
          base: locale.locale,
        };
        break;
      }
    }
  }

  if (firstAvailableBaseMatch !== undefined) {
    return firstAvailableBaseMatch.match;
  }

  // If no match found use fallbackLocale
  return undefined;
};

function getArrayElementCaseInsensitive(
  array: string[],
  searchElement: string
): string | undefined {
  searchElement = searchElement.toLowerCase();
  for (const element of array) {
    if (element.toLowerCase() === searchElement) {
      return element;
    }
  }
  return undefined;
}
