import * as path from "path";
import * as fs from "fs/promises";

import * as babel from "@babel/core";
import buildICUPlugin, {
  PrecompileIntlOptions,
} from "@gigahatch/babel-plugin-precompile-intl";
import pathStartsWith from "path-starts-with";
import type { Plugin } from "vite";
import createHyphenator, { HyphenationFunctionSync } from "hyphen";

const intlPrecompiler = buildICUPlugin("@gigahatch/svelte-intl-precompile");

export async function transformCode(
  code: string,
  hyphenate: boolean,
  options: Record<string, any>
): Promise<string | null | undefined> {
  let opts: PrecompileIntlOptions = {};

  if (hyphenate) {
    let basename = path.parse(options["filename"]).name;
    if (basename === "en") {
      basename = "en-us";
    }
    if (basename === "de") {
      basename = "de-1996";
    }

    const patterns = (await import(`hyphen/patterns/${basename}.js`)).default;
    const hyphen = createHyphenator(patterns, {
      async: false,
      html: true,
    }) as HyphenationFunctionSync;

    opts = {
      literalTransform: hyphen,
    };
  }

  return babel.transform(code, {
    ...options,
    generatorOpts: {
      jsescOption: {
        minimal: true
      },
    },
    plugins: [[intlPrecompiler, opts]],
  })?.code;
}

export default (
  localesRoot: string = "locales",
  hyphenate: boolean = false
): Plugin => {
  const prefix = "$locales";

  async function loadPrefixModule() {
    const code = [
      `import { register } from '@gigahatch/svelte-intl-precompile'`,
      `export function registerAll() {`,
    ];

    const availableLocales: string[] = [];
    const languageFiles = await fs.readdir(localesRoot);

    // add register calls for each found locale
    for (const file of languageFiles) {
      const extname = path.extname(file);

      if (extname !== ".json") {
        throw new Error("Locale files have to be in json format!");
      }

      const locale = path.basename(file, extname);

      // ensure we register each locale only once
      // there shouldn't be more than one file each locale
      // our load(id) method only ever loads the first found
      // file for a locale and it makes no sense to register
      // more than one file per locale
      if (!availableLocales.includes(locale)) {
        availableLocales.push(locale);

        code.push(
          `  register(${JSON.stringify(locale)}, () => import(${JSON.stringify(
            `${prefix}/${locale}`
          )}))`
        );
      }
    }

    // Sort locales that more specific locales come first
    // 'en-US' comes before 'en'
    availableLocales.sort((a, b) => {
      const order = a.split("-").length - b.split("-").length;

      if (order) return order;

      return a.localeCompare(b, "en");
    });

    code.push(
      `}`,
      `export const availableLocales = ${JSON.stringify(availableLocales)}`
    );

    return code.join("\n");
  }

  async function tranformLocale(
    content: string,
    filename: string,
    hyphenate: boolean
  ) {
    const json = JSON.parse(content);
    const code = `export default ${JSON.stringify(json)}`;

    const transformed = await transformCode(code, hyphenate, { filename });
    return transformed;
  }

  async function findLocale(filename: string, hyphenate: boolean) {
    const absolutePath = path.resolve(localesRoot, filename);
    const text = await fs.readFile(absolutePath, { encoding: "utf-8" });
    return tranformLocale(text, absolutePath, hyphenate);
  }

  return {
    name: "@gigahatch/svelte-intl-precompile", // required, will show up in warnings and errors

    enforce: "pre",
    configureServer(server) {
      const { ws, watcher, moduleGraph } = server;
      // listen to vite files watcher
      watcher.on("change", (file) => {
        file = path.relative("", file);
        // check if file changed is a locale
        if (pathStartsWith(file, localesRoot)) {
          // invalidate $locales/<locales><extname> modules
          const name = `${prefix}/${path.basename(file, path.extname(file))}`;
          const localeModule = moduleGraph.getModuleById(name);
          if (localeModule) {
            moduleGraph.invalidateModule(localeModule);
          }

          // invalidate $locales module
          const prefixModule = moduleGraph.getModuleById(prefix);
          if (prefixModule) {
            moduleGraph.invalidateModule(prefixModule);
          }

          // trigger hmr
          ws.send({ type: "full-reload", path: "*" });
        }
      });
    },
    
    resolveId(id) {
      if (id === prefix || id.startsWith(`${prefix}/`)) return id;
      return null;
    },
    load(id) {
      // allow to auto register locales by calling registerAll from $locales module
      // import { registerAll, availableLocales } from '$locales'
      if (id === prefix) {
        return loadPrefixModule();
      }

      // import en from '$locales/en'
      if (id.startsWith(`${prefix}/`)) {
        return findLocale(`${path.basename(id)}.json`, hyphenate);
      }

      return null;
    },
  };
};
