import { getMessageFromDictionary } from "../stores/instanceState.js";

export const lookup = (path: string, localeGroup: string) => {
  if (localeGroup == null) return undefined;

  const message = getMessageFromDictionary(localeGroup, path);

  return message;
};
