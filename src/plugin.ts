import * as path from "path";
import * as fs from "fs/promises";
import * as babel from "@babel/core";
import compiler from "./compiler.js";
import type { Plugin } from "vite";
import createHyphenator, { HyphenationFunctionSync } from "hyphen";
import flatten from "flat";
import {
  MessageFormatElement,
  parse,
} from "@formatjs/icu-messageformat-parser";

async function getHyphenator(locale: string) {
  if (locale === "en") {
    locale = "en-us";
  }
  if (locale === "de") {
    locale = "de-1996";
  }

  const patterns = (await import(`hyphen/patterns/${locale}.js`)).default;
  return createHyphenator(patterns, {
    async: false,
    html: true,
  }) as HyphenationFunctionSync;
}

function hyphenateAst(
  hyphenator: HyphenationFunctionSync,
  ast: MessageFormatElement[]
) {
  function recurse(ast: MessageFormatElement[]) {
    for (const el of ast) {
      switch (el.type) {
        case 0: // literal
          el.value = hyphenator(el.value) as string;
          continue;

        case 5: // select
        case 6: // plural
          for (const { value } of Object.values(el.options)) recurse(value);
          continue;

        case 8: // tag
          recurse(el.children);
          continue;

        default:
          continue;
      }
    }
  }

  recurse(ast);
}

async function generateTypes(
  localesRoot: string,
  translationKey: TranslationKey
) {
  const translationKeys: string[][] = [];
  for (const file of await fs.readdir(localesRoot)) {
    translationKeys.push(
      Object.keys(
        flatten(
          JSON.parse(
            await fs.readFile(path.resolve(localesRoot, file), {
              encoding: "utf-8",
            })
          )
        )
      )
    );
  }

  let code: string[] = [];

  if (translationKeys[0]) {
    code.push(
      "import type { TypedFormat } from '@gigahatch/svelte-intl-precompile';"
    );
    code.push("declare module '$locales' {");

    let subsetKeys: string[];
    if (translationKey === "KeysContainedInAllLanguages") {
      subsetKeys = translationKeys[0].filter((key) =>
        translationKeys.every((keys) => keys.includes(key))
      );
    } else {
      subsetKeys = translationKeys.flat();
    }
    const typedef = `export type TranslationKeys = ${subsetKeys
      .map((v) => `"${v}"`)
      .join("|")};`;

    code.push(typedef);
    code.push("export const t: TypedFormat<TranslationKeys>;");
    code.push("export const registerAll: () => void;");
    code.push("export const availableLocales: string[];");
    code.push("}");
  }

  const filePath = path.resolve(
    ".svelte-kit",
    "types",
    "src",
    "svelte-intl-precompile",
    "$types.d.ts"
  );
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, code.join("\n"));
}

export async function transformCode(
  code: string,
  hyphenate: boolean,
  options: Record<string, any>
): Promise<string | null | undefined> {
  const basename = path.parse(options["filename"]).name;
  const hyphenator = await getHyphenator(basename);

  const intlPrecompiler = compiler((v) => {
    const ast = parse(v, { ignoreTag: true });

    if (hyphenate) {
      hyphenateAst(hyphenator, ast);
    }

    return ast;
  });

  return babel.transform(code, {
    ...options,
    generatorOpts: {
      jsescOption: {
        minimal: true,
      },
    },
    plugins: [intlPrecompiler],
  })?.code;
}

export type TranslationKey =
  | "EveryKeyInEveryLanguage"
  | "KeysContainedInAllLanguages";

export default (
  localesRoot: string = "locales",
  hyphenate: boolean = false,
  translationKey: TranslationKey = "KeysContainedInAllLanguages"
): Plugin => {
  const prefix = "$locales";

  async function loadPrefixModule() {
    const code = [
      `import { register } from '@gigahatch/svelte-intl-precompile'`,
      `export {__t as t} from '@gigahatch/svelte-intl-precompile';`,
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
          `  register(${JSON.stringify(locale)}, [() => import(${JSON.stringify(
            `${prefix}/${locale}`
          )})])`
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
    const flattened = flatten<object, Record<string, string>>(json);
    const code = `export default ${JSON.stringify(flattened)}`;
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
      watcher.on("change", async (file) => {
        file = path.relative("", file);
        // check if file changed is a locale

        if (file.startsWith(localesRoot)) {
          // invalidate $locales/<locales><extname> modules
          const name = `${prefix}/${path.basename(file, path.extname(file))}`;
          const localeModule = moduleGraph.getModuleById(name);
          if (localeModule) {
            moduleGraph.invalidateModule(localeModule);
            await generateTypes(localesRoot, translationKey);
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
    buildStart() {
      return generateTypes(localesRoot, translationKey);
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
