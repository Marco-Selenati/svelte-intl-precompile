var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import * as path from "path";
import * as fs from "fs/promises";
import * as babel from "@babel/core";
import buildICUPlugin from "babel-plugin-precompile-intl";
import pathStartsWith from "path-starts-with";
import createHyphenator from "hyphen";
var intlPrecompiler = buildICUPlugin("svelte-intl-precompile");
export function transformCode(code, options) {
    var _a;
    return (_a = babel.transform(code, __assign(__assign({}, options), { plugins: [intlPrecompiler] }))) === null || _a === void 0 ? void 0 : _a.code;
}
export default (function (localesRoot) {
    if (localesRoot === void 0) { localesRoot = "locales"; }
    var prefix = "$locales";
    var resolvedPath = path.resolve(localesRoot);
    var transformers = {
        ".json": function (content) { return __awaiter(void 0, void 0, void 0, function () {
            var json;
            return __generator(this, function (_a) {
                json = JSON.parse(content);
                return [2 /*return*/, "export default ".concat(JSON.stringify(json))];
            });
        }); }
    };
    function loadPrefixModule() {
        return __awaiter(this, void 0, void 0, function () {
            var code, availableLocales, languageFiles, _i, languageFiles_1, file, extname, locale;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        code = [
                            "import { register } from 'svelte-intl-precompile'",
                            "export function registerAll() {",
                        ];
                        availableLocales = [];
                        return [4 /*yield*/, fs.readdir(localesRoot)];
                    case 1:
                        languageFiles = _a.sent();
                        // add register calls for each found locale
                        for (_i = 0, languageFiles_1 = languageFiles; _i < languageFiles_1.length; _i++) {
                            file = languageFiles_1[_i];
                            extname = path.extname(file);
                            if (extname !== ".json") {
                                throw new Error("Locale files have to be in json format!");
                            }
                            if (transformers[extname]) {
                                locale = path.basename(file, extname);
                                // ensure we register each locale only once
                                // there shouldn't be more than one file each locale
                                // our load(id) method only ever loads the first found
                                // file for a locale and it makes no sense to register
                                // more than one file per locale
                                if (!availableLocales.includes(locale)) {
                                    availableLocales.push(locale);
                                    code.push("  register(".concat(JSON.stringify(locale), ", () => import(").concat(JSON.stringify("".concat(prefix, "/").concat(locale)), "))"));
                                }
                            }
                        }
                        // Sort locales that more specific locales come first
                        // 'en-US' comes before 'en'
                        availableLocales.sort(function (a, b) {
                            var order = a.split("-").length - b.split("-").length;
                            if (order)
                                return order;
                            return a.localeCompare(b, "en");
                        });
                        code.push("}", "export const availableLocales = ".concat(JSON.stringify(availableLocales)));
                        return [2 /*return*/, code.join("\n")];
                }
            });
        });
    }
    function tranformLocale(content, filename, transform) {
        return __awaiter(this, void 0, void 0, function () {
            var basename, patterns, hypen, traverse, hyphenated, code, transformed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        basename = path.parse(filename).name;
                        if (basename === "en") {
                            basename = "en-us";
                        }
                        if (basename === "de") {
                            basename = "de-1996";
                        }
                        return [4 /*yield*/, import("hyphen/patterns/".concat(basename, ".js"))];
                    case 1:
                        patterns = (_a.sent())["default"];
                        hypen = createHyphenator(patterns, { async: false });
                        traverse = function (level) {
                            var obj = {};
                            for (var _i = 0, _a = Object.entries(level); _i < _a.length; _i++) {
                                var _b = _a[_i], k = _b[0], v = _b[1];
                                if (typeof v === "string") {
                                    var h = hypen(v);
                                    obj[k] = h;
                                }
                                else if (typeof v === "object") {
                                    obj[k] = traverse(v);
                                }
                            }
                            return obj;
                        };
                        hyphenated = traverse(JSON.parse(content));
                        content = JSON.stringify(hyphenated);
                        return [4 /*yield*/, transform(content)];
                    case 2:
                        code = _a.sent();
                        transformed = transformCode(code, { filename: filename });
                        return [2 /*return*/, transformed];
                }
            });
        });
    }
    function findLocale(basename) {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function () {
            var filebase, _b, _c, _d, extname, transform, filename, text, error_1, e_1_1;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        filebase = path.resolve(localesRoot, basename);
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 9, 10, 15]);
                        _b = __asyncValues(Object.entries(transformers));
                        _e.label = 2;
                    case 2: return [4 /*yield*/, _b.next()];
                    case 3:
                        if (!(_c = _e.sent(), !_c.done)) return [3 /*break*/, 8];
                        _d = _c.value, extname = _d[0], transform = _d[1];
                        filename = filebase + extname;
                        _e.label = 4;
                    case 4:
                        _e.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, fs.readFile(filename, { encoding: "utf-8" })];
                    case 5:
                        text = _e.sent();
                        return [2 /*return*/, tranformLocale(text, filename, transform)];
                    case 6:
                        error_1 = _e.sent();
                        // incase the file did not exist try next transformer
                        // otherwise propagate the error
                        if (error_1.code !== "ENOENT") {
                            throw error_1;
                        }
                        return [3 /*break*/, 7];
                    case 7: return [3 /*break*/, 2];
                    case 8: return [3 /*break*/, 15];
                    case 9:
                        e_1_1 = _e.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 15];
                    case 10:
                        _e.trys.push([10, , 13, 14]);
                        if (!(_c && !_c.done && (_a = _b["return"]))) return [3 /*break*/, 12];
                        return [4 /*yield*/, _a.call(_b)];
                    case 11:
                        _e.sent();
                        _e.label = 12;
                    case 12: return [3 /*break*/, 14];
                    case 13:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 14: return [7 /*endfinally*/];
                    case 15: return [2 /*return*/, null];
                }
            });
        });
    }
    return {
        name: "svelte-intl-precompile",
        enforce: "pre",
        configureServer: function (server) {
            var ws = server.ws, watcher = server.watcher, moduleGraph = server.moduleGraph;
            // listen to vite files watcher
            watcher.on("change", function (file) {
                file = path.relative("", file);
                // check if file changed is a locale
                if (pathStartsWith(file, localesRoot)) {
                    // invalidate $locales/<locales><extname> modules
                    var name = "".concat(prefix, "/").concat(path.basename(file, path.extname(file)));
                    // Alltough we are normalizing the module names
                    // $locales/en.js -> $locales/en
                    // we check all configured extensions just to be sure
                    // '.js', '.ts', '.json', ..., and '' ($locales/en)
                    for (var _i = 0, _a = __spreadArray(__spreadArray([], Object.keys(transformers), true), [""], false); _i < _a.length; _i++) {
                        var extname = _a[_i];
                        // check if locale file is in vite cache
                        var localeModule = moduleGraph.getModuleById("".concat(name).concat(extname));
                        if (localeModule) {
                            moduleGraph.invalidateModule(localeModule);
                        }
                    }
                    // invalidate $locales module
                    var prefixModule = moduleGraph.getModuleById(prefix);
                    if (prefixModule) {
                        moduleGraph.invalidateModule(prefixModule);
                    }
                    // trigger hmr
                    ws.send({ type: "full-reload", path: "*" });
                }
            });
        },
        resolveId: function (id) {
            if (id === prefix || id.startsWith("".concat(prefix, "/"))) {
                var extname = path.extname(id);
                // "normalize" module id to have no extension
                // $locales/en.js -> $locales/en
                // we do this as the extension is ignored
                // when loading a locale
                // we always try to find a locale file by its basename
                // and adding an extension from transformers
                // additionally this prevents loading the same module/locale
                // several times with different extensions
                var normalized = extname ? id.slice(0, -extname.length) : id;
                return normalized;
            }
            return null;
        },
        load: function (id) {
            // allow to auto register locales by calling registerAll from $locales module
            // import { registerAll, availableLocales } from '$locales'
            if (id === prefix) {
                return loadPrefixModule();
            }
            // import en from '$locales/en'
            // import en from '$locales/en.js'
            if (id.startsWith("".concat(prefix, "/"))) {
                var extname = path.extname(id);
                // $locales/en    -> en
                // $locales/en.js -> en
                // $locales/en.ts -> en
                var locale = extname
                    ? id.slice("".concat(prefix, "/").length, -extname.length)
                    : id.slice("".concat(prefix, "/").length);
                return findLocale(locale);
            }
            return null;
        },
        transform: function (content, id) {
            // import locale from '../locales/en.js'
            if (pathStartsWith(id, resolvedPath)) {
                return tranformLocale(content, id, transformers[".json"]);
            }
            return null;
        }
    };
});
