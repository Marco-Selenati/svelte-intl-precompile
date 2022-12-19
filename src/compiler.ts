import { declare } from "@babel/helper-plugin-utils";
import {
  ArgumentElement,
  DateElement,
  ExtendedNumberFormatOptions,
  isArgumentElement,
  isDateElement,
  isDateTimeSkeleton,
  isLiteralElement,
  isNumberElement,
  isNumberSkeleton,
  isPoundElement,
  isSelectElement,
  isTagElement,
  isTimeElement,
  MessageFormatElement,
  NumberElement,
  PluralElement,
  SelectElement,
  TimeElement,
  TYPE,
} from "@formatjs/icu-messageformat-parser";
import type {
  TemplateElement,
  Expression,
  Identifier,
  StringLiteral,
} from "@babel/types";

type HelperFunctions =
  | "__interpolate"
  | "__number"
  | "__date"
  | "__time"
  | "__select"
  | "__plural"
  | "__offsetPlural";

const HELPERS_MAP: Record<TYPE, HelperFunctions> = {
  0: "__interpolate", // This should not happen
  1: "__interpolate",
  2: "__number",
  3: "__date",
  4: "__time",
  5: "__select",
  6: "__plural",
  7: "__interpolate", // This should not happen
  8: "__interpolate", // This should not happen
};
type PluralTypes = "zero" | "one" | "two" | "few" | "many" | "other";
type PluralAbbreviation = "z" | "o" | "t" | "f" | "m" | "h";
const PLURAL_ABBREVIATIONS: Record<PluralTypes, PluralAbbreviation> = {
  zero: "z",
  one: "o",
  two: "t",
  few: "f",
  many: "m",
  other: "h",
};

type BuildOptions = {
  currentFunctionParams: Set<string>;
  pluralsStack: PluralElement[];
  usedHelpers: Set<HelperFunctions>;
};

const USED_HELPERS = "usedHelpers";

export default function build(parser: (v: string) => MessageFormatElement[]) {
  return declare(({ types: t, assertVersion }, _opts) => {
    assertVersion("^7.0");

    function normalizeKey(key: string): number | string {
      key = key.trim();
      let match = key.match(/^=(\d)/);
      if (match && match[1]) return parseInt(match[1], 10);
      return key;
    }

    function normalizePluralKey(
      key: string | PluralTypes
    ): number | PluralAbbreviation {
      key = key.trim();
      let match = key.match(/^=(\d+)/);
      if (match && match[1]) return parseInt(match[1], 10);
      return PLURAL_ABBREVIATIONS[key as PluralTypes] || key;
    }

    function buildCallExpression(
      entry: MessageFormatElement,
      opts: BuildOptions
    ) {
      if (isLiteralElement(entry)) return t.stringLiteral(entry.value);
      if (isTagElement(entry)) throw new Error("Tag elements not supported!");
      if (isPoundElement(entry))
        throw new Error("Pound elements not supported!");
      if (isNumberElement(entry)) {
        return buildNumberCallExpression(entry, opts);
      }
      if (isDateElement(entry) || isTimeElement(entry)) {
        return buildDateOrTimeCallExpression(entry, opts);
      }
      if (isArgumentElement(entry)) {
        return buildInterpolateCallExpression(entry, opts);
      }
      if (isSelectElement(entry)) {
        return buildSelectCallExpression(entry, opts);
      }
      return buildPluralCallExpression(entry, opts);
    }

    function buildNumberCallExpression(
      entry: NumberElement,
      { usedHelpers, currentFunctionParams }: BuildOptions
    ) {
      usedHelpers.add(HELPERS_MAP[entry.type]);
      let callArgs = [];
      if (isNumberSkeleton(entry.style) && entry.style.parsedOptions.scale) {
        callArgs.push(
          t.binaryExpression(
            "/",
            t.identifier(entry.value),
            t.numericLiteral(entry.style.parsedOptions.scale)
          )
        );
        delete entry.style.parsedOptions.scale;
      } else {
        callArgs.push(t.identifier(entry.value));
      }
      currentFunctionParams.add(entry.value);
      if (isNumberSkeleton(entry.style)) {
        if (Object.keys(entry.style.parsedOptions).length > 0) {
          // TODO: Being a compiler gives us the chance to be better at some things than other libraries
          // For instance, when using `{style: 'unit', unit: XXXXX}` unit can only be one of a known list of units
          // (see https://stackoverflow.com/questions/68035616/invalid-unit-argument-for-intl-numberformat-with-electric-units-volt-joule)
          // Any unit but those will throw a runtime error, but we could error or at least show a warning to the user
          // when invalid. P.e. a common mistake could be to use `unit: 'km'` (wrong) instead of the correct (`unit: 'kilometer'`).
          let keys = Object.keys(
            entry.style.parsedOptions
          ) as (keyof ExtendedNumberFormatOptions)[];
          let options = t.objectExpression(
            keys.map((key) => {
              if (!isNumberSkeleton(entry.style))
                throw new Error("The entry should have had a number skeleton");
              let val = entry.style.parsedOptions[key] as number | string;
              return t.objectProperty(
                t.identifier(key),
                typeof val === "number"
                  ? t.numericLiteral(val)
                  : t.stringLiteral(val)
              );
            })
          );
          callArgs.push(options);
        }
      } else if (typeof entry.style === "string") {
        callArgs.push(t.stringLiteral(entry.style));
      }
      return t.callExpression(t.identifier("__number"), callArgs);
    }

    function buildDateOrTimeCallExpression(
      entry: DateElement | TimeElement,
      { usedHelpers, currentFunctionParams }: BuildOptions
    ) {
      let fnName = HELPERS_MAP[entry.type];
      usedHelpers.add(fnName);
      let callArgs: (Identifier | StringLiteral)[] = [
        t.identifier(entry.value),
      ];
      currentFunctionParams.add(entry.value);
      if (isDateTimeSkeleton(entry.style))
        throw new Error("Datetime skeletons not supported yet");
      if (entry.style) {
        callArgs.push(t.stringLiteral(entry.style));
      }
      return t.callExpression(t.identifier(fnName), callArgs);
    }

    function buildInterpolateCallExpression(
      entry: ArgumentElement,
      { usedHelpers, currentFunctionParams }: BuildOptions
    ) {
      let fnName = HELPERS_MAP[entry.type];
      usedHelpers.add(fnName);
      currentFunctionParams.add(entry.value);
      return t.callExpression(t.identifier(fnName), [
        t.identifier(entry.value),
      ]);
    }

    function buildPluralCallExpression(
      entry: PluralElement,
      opts: BuildOptions
    ) {
      const { pluralsStack, usedHelpers, currentFunctionParams } = opts;
      let fnName = HELPERS_MAP[entry.type];
      pluralsStack.push(entry);
      usedHelpers.add(entry.offset !== 0 ? "__offsetPlural" : "__plural");
      let options = t.objectExpression(
        Object.entries(entry.options).map(([key, option]) => {
          let objValueAST = option.value;
          let objValue: Expression;
          if (objValueAST.length === 1 && objValueAST[0]?.type === 0) {
            objValue = t.stringLiteral(objValueAST[0].value);
          } else {
            objValue =
              objValueAST.length === 1
                ? buildCallExpression(
                    objValueAST[0] as MessageFormatElement,
                    opts
                  )
                : buildTemplateLiteral(objValueAST, opts);
          }
          let normalizedKey = normalizePluralKey(key);
          return t.objectProperty(
            typeof normalizedKey === "number"
              ? t.numericLiteral(normalizedKey)
              : t.identifier(normalizedKey),
            objValue
          );
        })
      );
      pluralsStack.pop();
      currentFunctionParams.add(entry.value);
      if (entry.offset !== 0) {
        return t.callExpression(t.identifier("__offsetPlural"), [
          t.identifier(entry.value),
          t.numericLiteral(entry.offset),
          options,
        ]);
      } else {
        return t.callExpression(t.identifier(fnName), [
          t.identifier(entry.value),
          options,
        ]);
      }
    }

    function buildSelectCallExpression(
      entry: SelectElement,
      opts: BuildOptions
    ) {
      const { usedHelpers, currentFunctionParams } = opts;
      let fnName = HELPERS_MAP[entry.type];
      usedHelpers.add(fnName);
      let options = t.objectExpression(
        Object.entries(entry.options).map(([key, option]) => {
          let objValueAST = option.value;
          let objValue: Expression;
          if (objValueAST.length === 1 && objValueAST[0]?.type === 0) {
            objValue = t.stringLiteral(objValueAST[0].value);
          } else {
            objValue =
              objValueAST.length === 1
                ? buildCallExpression(
                    objValueAST[0] as MessageFormatElement,
                    opts
                  )
                : buildTemplateLiteral(objValueAST, opts);
          }
          let normalizedKey = normalizeKey(key);
          return t.objectProperty(
            typeof normalizedKey === "number"
              ? t.numericLiteral(normalizedKey)
              : t.identifier(normalizedKey),
            objValue
          );
        })
      );
      currentFunctionParams.add(entry.value);
      return t.callExpression(t.identifier(fnName), [
        t.identifier(entry.value),
        options,
      ]);
    }

    function buildTemplateLiteral(
      ast: MessageFormatElement[],
      opts: BuildOptions
    ) {
      const { currentFunctionParams, pluralsStack } = opts;
      let quasis: TemplateElement[] = [];
      let expressions: Expression[] = [];
      for (const [i, entry] of ast.entries()) {
        switch (entry.type) {
          case 0: // literal
            quasis.push(
              t.templateElement(
                // { value: entry.value, raw: entry.value }, this is not valid anymore?
                { cooked: entry.value, raw: entry.value },
                i === ast.length - 1 // tail
              )
            );
            break;
          case 1: // intepolation
            expressions.push(buildCallExpression(entry, opts));
            currentFunctionParams.add(entry.value);
            if (i === 0)
              quasis.push(t.templateElement({ cooked: "", raw: "" }, false));
            break;
          case 2: // Number format
            expressions.push(buildCallExpression(entry, opts));
            currentFunctionParams.add(entry.value);
            break;
          case 3: // Date format
            expressions.push(buildCallExpression(entry, opts));
            currentFunctionParams.add(entry.value);
            break;
          case 4: // Time format
            expressions.push(buildCallExpression(entry, opts));
            currentFunctionParams.add(entry.value);
            break;
          case 5: // select
            expressions.push(buildCallExpression(entry, opts));
            break;
          case 6: // plural
            expressions.push(buildCallExpression(entry, opts));
            break;
          case 7: // # interpolation
            let lastPlural = pluralsStack[pluralsStack.length - 1];
            if (
              lastPlural &&
              lastPlural.offset !== null &&
              lastPlural.offset !== 0
            ) {
              expressions.push(
                t.binaryExpression(
                  "-",
                  t.identifier(lastPlural.value),
                  t.numericLiteral(lastPlural.offset)
                )
              );
            } else if (lastPlural) {
              expressions.push(t.identifier(lastPlural.value));
            }
            if (i === 0)
              quasis.push(t.templateElement({ cooked: "", raw: "" }, false));
            break;
          default:
            debugger;
        }
        if (i === ast.length - 1 && entry.type !== 0) {
          quasis.push(t.templateElement({ cooked: "", raw: "" }, true));
        }
      }

      if (quasis.length === expressions.length && quasis.length === 0) {
        return t.stringLiteral(""); // If there's no data, return an empty string. No need to use backquotes.
      }
      // If the number of quasis must be one more than the number of expressions (because expressions go
      // in between). If that's not the case it means we need an empty string as first quasis.
      while (quasis.length <= expressions.length) {
        quasis.unshift(t.templateElement({ cooked: "", raw: "" }, false));
      }

      return t.templateLiteral(quasis, expressions);
    }

    function buildFunction(
      ast: MessageFormatElement[],
      usedHelpers: Set<HelperFunctions>
    ) {
      const currentFunctionParams = new Set<string>();
      const pluralsStack: PluralElement[] = [];

      const opts = { currentFunctionParams, pluralsStack, usedHelpers };

      let body =
        ast.length === 1
          ? buildCallExpression(ast[0] as MessageFormatElement, opts)
          : buildTemplateLiteral(ast, opts);
      if (Array.from(currentFunctionParams).length === 0) {
        return body;
      }
      return t.arrowFunctionExpression(
        Array.from(currentFunctionParams)
          .sort()
          .map((p) => t.identifier(p)),
        body
      );
    }

    return {
      visitor: {
        Program: {
          enter() {
            this[USED_HELPERS] = new Set<HelperFunctions>();
          },
          exit(path) {
            const usedHelpers = this[USED_HELPERS] as Set<HelperFunctions>;
            if (usedHelpers.size > 0) {
              let importDeclaration = t.importDeclaration(
                Array.from(usedHelpers)
                  .sort()
                  .map((name) =>
                    t.importSpecifier(t.identifier(name), t.identifier(name))
                  ),
                t.stringLiteral("@gigahatch/svelte-intl-precompile")
              );
              path.unshiftContainer("body", importDeclaration);
            }
          },
        },

        ObjectProperty({ node }) {
          if (!t.isStringLiteral(node.value))
            throw new Error("Value needs to be an String");

          const usedHelpers = this[USED_HELPERS] as Set<HelperFunctions>;

          const ast: MessageFormatElement[] = parser(node.value.value);
          node.value = buildFunction(ast, usedHelpers);
        },
      },
    };
  });
}
