import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { applyDependencySecurityPatches, bracePatches, patchSource } from "./apply-dependency-security-patches.mjs";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const braces = require("braces");
const rejected = fn => assert.throws(fn, error => error instanceof SyntaxError && error.code === "ERR_BRACES_MAX_DEPTH");
const deeplyNested = "{".repeat(4500) + "x" + "}".repeat(4500);

test("deep brace, parenthesis and unfinished patterns fail at a bounded parser boundary", () => {
  const patterns = [deeplyNested, "(".repeat(4500) + "x" + ")".repeat(4500), "{".repeat(4500) + "x"];
  for (const pattern of patterns) for (const method of ["parse", "compile", "expand", "stringify"]) {
    rejected(() => braces[method](pattern, { maxLength: 10000, rangeLimit: false }));
  }
  rejected(() => braces(["{a,b}", deeplyNested], { expand: true }));
  rejected(() => braces.create(deeplyNested));
});

test("direct and internal AST entry points also reject deep or cyclic trees", () => {
  let ast = { type: "text", value: "x" };
  for (let index = 0; index < 4500; index++) ast = { type: "root", nodes: [ast] };
  const cycle = { type: "root", nodes: [] };
  cycle.nodes.push(cycle);
  for (const method of ["compile", "expand", "stringify"]) {
    rejected(() => braces[method](ast));
    rejected(() => require(`braces/lib/${method}.js`)(ast));
    rejected(() => braces[method](cycle));
  }
});

test("the original stack-exhaustion trigger no longer reaches recursive walkers", () => {
  const child = spawnSync(process.execPath, ["--stack-size=512", "--input-type=commonjs", "-e", `
    const assert = require('node:assert/strict');
    const braces = require(${JSON.stringify(require.resolve("braces"))});
    const pattern = '{'.repeat(4500) + 'x' + '}'.repeat(4500);
    for (const method of ['compile', 'expand', 'stringify']) {
      assert.throws(() => braces[method](pattern), e => e.code === 'ERR_BRACES_MAX_DEPTH');
    }
  `], { cwd: root, encoding: "utf8", timeout: 3000 });
  assert.equal(child.status, 0, child.stderr || child.error?.message);
});

test("array-like and iterable non-parser ASTs cannot bypass depth validation", () => {
  let arrayLike = { type: "text", value: "x" };
  for (let index = 0; index < 4500; index++) {
    arrayLike = { type: "root", nodes: { 0: arrayLike, length: 1 } };
  }
  const iterable = { type: "root", nodes: new Set([{ type: "text", value: "x" }]) };
  for (const method of ["compile", "expand", "stringify"]) for (const ast of [arrayLike, iterable]) {
    for (const fn of [braces[method], require(`braces/lib/${method}.js`)]) {
      assert.throws(() => fn(ast), error => error.code === "ERR_BRACES_INVALID_AST");
    }
  }
});

test("ordinary glob alternatives, ranges, escaping and quoted literal braces retain their semantics", () => {
  assert.deepEqual(braces.expand("src/{pages,components}/**/*.{astro,tsx}"), [
    "src/pages/**/*.astro", "src/pages/**/*.tsx", "src/components/**/*.astro", "src/components/**/*.tsx",
  ]);
  assert.deepEqual(braces.expand("{a,{b,c}}"), ["a", "b", "c"]);
  assert.deepEqual(braces.expand("{01..03}"), ["01", "02", "03"]);
  assert.deepEqual(braces.expand("{a,a,b}", { nodupes: true }), ["a", "b"]);
  assert.deepEqual(braces.expand("\\{literal\\}"), ["{literal}"]);
  assert.deepEqual(braces.expand('"' + "{".repeat(200) + '"'), ["{".repeat(200)]);
  assert.equal(braces.stringify(braces.parse("foo/{a,b}/bar")), "foo/{a,b}/bar");
  assert.deepEqual(braces.expand("${literal}"), ["${literal}"]);
});

test("micromatch and fast-glob use the protected dependency while ordinary callers still work", () => {
  const micromatch = require("micromatch");
  assert.deepEqual(micromatch(["a.ts", "b.js", "c.css"], "*.{ts,js}"), ["a.ts", "b.js"]);
  const glob = require("fast-glob");
  assert.ok(glob.sync("src/pages/{index,platform}.astro", { cwd: root }).length >= 1);
  rejected(() => micromatch.braces(deeplyNested, { expand: true }));
  rejected(() => glob.generateTasks(deeplyNested));
  const nextRequire = createRequire(require.resolve("@next/eslint-plugin-next/package.json"));
  rejected(() => nextRequire("fast-glob").generateTasks(deeplyNested));
  const watcherRequire = createRequire(require.resolve("wireit/package.json"));
  const chokidarRequire = createRequire(watcherRequire.resolve("chokidar"));
  rejected(() => chokidarRequire("braces").expand(deeplyNested));
});

test("reinstall patch is idempotent and rejects an unexpected upstream implementation", () => {
  assert.ok(applyDependencySecurityPatches(root) >= 1);
  assert.ok(applyDependencySecurityPatches(root) >= 1);
  for (const patch of bracePatches) {
    const source = readFileSync(join(root, "node_modules/braces", patch.path), "utf8");
    assert.equal(patchSource(source, patch), source);
    assert.throws(() => patchSource(source + "\n// unexpected modification", patch), /Refusing unexpected/);
  }
});

test("all installed lockfile copies of braces are protected and vulnerable sprintf-js is absent", () => {
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  for (const [path, entry] of Object.entries(lock.packages)) {
    assert.ok(!path.endsWith("node_modules/sprintf-js"), path);
    if (path.endsWith("node_modules/argparse")) assert.equal(entry.version, "2.0.1");
    if (path.endsWith("node_modules/braces")) {
      const localRequire = createRequire(join(root, path, "package.json"));
      rejected(() => localRequire("./index.js").compile(deeplyNested));
    }
  }
  const tfRequire = createRequire(require.resolve("@tensorflow/tfjs/package.json"));
  assert.equal(tfRequire("argparse/package.json").version, "2.0.1");
  assert.throws(() => tfRequire.resolve("sprintf-js"), { code: "MODULE_NOT_FOUND" });
});

test("the parser replacement preserves named usage and ordinary argument parsing", () => {
  const { ArgumentParser } = require("argparse");
  const parser = new ArgumentParser({ prog: "volynx-tool", add_help: false, description: "Options for %(prog)s" });
  parser.add_argument("--name", { help: "name for %(prog)s" });
  assert.equal(parser.parse_args(["--name", "Edu"]).name, "Edu");
  assert.match(parser.format_help(), /Options for volynx-tool/);
  assert.match(parser.format_help(), /name for volynx-tool/);
});

test("browser TensorFlow and Upscaler runtime assets remain byte-for-byte unchanged", () => {
  const pairs = [
    ["node_modules/@tensorflow/tfjs/dist/tf.min.js", "public/vendor/upscaler-1.0.0-tfjs-4.11.0/tf.min.js"],
    ["node_modules/upscaler/dist/browser/umd/upscaler.min.js", "public/vendor/upscaler-1.0.0-tfjs-4.11.0/upscaler.min.js"],
  ];
  for (const [source, shipped] of pairs) {
    const hash = path => createHash("sha256").update(readFileSync(join(root, path))).digest("hex");
    assert.equal(hash(source), hash(shipped));
  }
});
