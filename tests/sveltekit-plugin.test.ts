import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import svelteIntlPrecompile from "../src/plugin";
import type { PlatformPath } from "path";

const enJsonTranslations = singleLineString`
{
  "simple": "Simple string",
  "interpolated": "String with one {value} interpolated"
}`;
const esJsonTranslations = singleLineString`
{
  "simple": "Cadena simple",
  "interpolated": "Cadena con un {value} interpolado"
}`;
const translationFiles = {
  "fakeroot/locales/en.json": enJsonTranslations,
  "fakeroot/locales/es.json": esJsonTranslations,
};

beforeEach(() => {
  vi.mock("path", async () => {
    const path = await vi.importActual<PlatformPath>("path");

    return {
      ...path,
      resolve(...paths) {
        return ["fakeroot", ...paths].join("/");
      }
    };
  });

  vi.mock("fs/promises", () => ({
    readdir() {
      return Promise.resolve().then(() => ["en.json", "es.json"]);
    },
    readFile(filename) {
      const content = translationFiles[filename];
      if (content) return content;
      let error = new Error("File not found");
      (error as any).code = "ENOENT";
      throw error;
    },
    mkdir() {return;},
    writeFile() {return;},
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("imports", () => {
  it("`$locales` returns a module that is aware of all the available locales", async () => {
    const plugin = svelteIntlPrecompile("locales", true);
    const content = await plugin.load("$locales");
    expect(content).toBe(singleLineString`
    import { register } from '@gigahatch/svelte-intl-precompile'
    export {__t as t} from '@gigahatch/svelte-intl-precompile';
    export function registerAll() {
      register("en", () => import("$locales/en"))
      register("es", () => import("$locales/es"))
    }
    export const availableLocales = ["en","es"]`);
  });

  it("`$locales/en.json` returns the translations for that language", async () => {
    const plugin = svelteIntlPrecompile("locales", true);
    const content = await plugin.load("$locales/en");

    expect(content).toBe(singleLineString`
      import { __interpolate } from "@gigahatch/svelte-intl-precompile";
      export default {
        "simple": "Sim\xADple string",
        "interpolated": value => \`String with one \${__interpolate(value)} in\xADter\xADpo\xADlat\xADed\`
      };`);
  });

  it("`$locales/es.json` returns the translations for that language", async () => {
    const plugin = svelteIntlPrecompile("locales", true);
    const content = await plugin.load("$locales/es");
    expect(content).toBe(singleLineString`
      import { __interpolate } from "@gigahatch/svelte-intl-precompile";
      export default {
        "simple": "Ca\xADde\xADna sim\xADple",
        "interpolated": value => \`Ca\xADde\xADna con un \${__interpolate(value)} in\xADter\xADpo\xADla\xADdo\`
      };`);
  });
});

function singleLineString([str]: TemplateStringsArray) {
  let lines: string[] = str.split("\n");
  if (lines[0] === "") {
    lines = lines.splice(1);
  }
  let firstLineSpaces = lines[0].search(/\S|$/);
  return lines.map((l) => l.substring(firstLineSpaces)).join("\n");
}
