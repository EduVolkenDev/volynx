import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// GHSA-vfj7-8cjw-p6xm has no upstream release as of 2026-10-21.
// Keep the installed version honest; npm audit will continue to report it.
// Exact upstream hashes make an unexpected package change fail installation.
export const depthGuard = `'use strict';

module.exports = ast => {
  const pending = [{ node: ast, depth: 0 }];
  while (pending.length) {
    const { node, depth } = pending.pop();
    if (depth > 128) {
      const error = new SyntaxError('Brace AST exceeds the safe nesting limit (128)');
      error.code = 'ERR_BRACES_MAX_DEPTH';
      throw error;
    }
    if (node && node.nodes != null && !Array.isArray(node.nodes)) {
      const error = new TypeError('Brace AST children must be an array');
      error.code = 'ERR_BRACES_INVALID_AST';
      throw error;
    }
    if (node && Array.isArray(node.nodes)) {
      for (const child of node.nodes) pending.push({ node: child, depth: depth + 1 });
    }
  }
};
`;

const guardImport = "const assertSafeDepth = require('./depth-limit');\n";
export const bracePatches = [
  {
    path: "lib/parse.js",
    sha256: "e572166565f15fa6ad9865ae49d678218e32aabfd1b3720f6d0d43d39800d310",
    from: "      stack.push(block);",
    to: `      if (stack.length >= 128) {
        const error = new SyntaxError('Brace pattern exceeds the safe nesting limit (128)');
        error.code = 'ERR_BRACES_MAX_DEPTH';
        throw error;
      }
      stack.push(block);`,
    occurrences: 2,
  },
  {
    path: "lib/compile.js",
    sha256: "dc98f22eee3d511785d92a00758d5f0d48efed5f5813bdecc2de430c529b5c9f",
    from: "const compile = (ast, options = {}) => {",
    to: `${guardImport}\nconst compile = (ast, options = {}) => {\n  assertSafeDepth(ast);`,
    occurrences: 1,
  },
  {
    path: "lib/expand.js",
    sha256: "41ccc196ebfa7b7781a634e721eb744e4e7bcb54cba427a7e3d6806a1b9e58f7",
    from: "const expand = (ast, options = {}) => {",
    to: `${guardImport}\nconst expand = (ast, options = {}) => {\n  assertSafeDepth(ast);`,
    occurrences: 1,
  },
  {
    path: "lib/stringify.js",
    sha256: "379f22d77bfa1478341ccd49c5e4267464aabcbba03558bab332aac23fc6f23a",
    from: "module.exports = (ast, options = {}) => {",
    to: `${guardImport}\nmodule.exports = (ast, options = {}) => {\n  assertSafeDepth(ast);`,
    occurrences: 1,
  },
];

const digest = source => createHash("sha256").update(source).digest("hex");

export function patchSource(source, patch) {
  const upstream = source.split(patch.to).join(patch.from);
  if (digest(upstream) !== patch.sha256) {
    throw new Error(`Refusing unexpected braces source: ${patch.path}`);
  }
  if (upstream.split(patch.from).length - 1 !== patch.occurrences) {
    throw new Error(`Unexpected patch locations: ${patch.path}`);
  }
  return upstream.split(patch.from).join(patch.to);
}

export function applyDependencySecurityPatches(root) {
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  const locations = Object.keys(lock.packages).filter(path => /(?:^|\/)node_modules\/braces$/.test(path));
  const writes = [];
  let installed = 0;
  for (const location of locations) {
    const directory = join(root, location);
    const manifest = join(directory, "package.json");
    if (!existsSync(manifest)) continue; // npm ci --omit=dev need not install this tooling.
    const pkg = JSON.parse(readFileSync(manifest, "utf8"));
    if (pkg.version !== "3.0.3") throw new Error(`Review braces security patch before using ${pkg.version}`);
    installed++;
    for (const patch of bracePatches) {
      const path = join(directory, patch.path);
      const source = readFileSync(path, "utf8");
      const patched = patchSource(source, patch);
      if (patched !== source) writes.push({ path, source: patched });
    }
    const guardPath = join(directory, "lib/depth-limit.js");
    if (existsSync(guardPath) && readFileSync(guardPath, "utf8") !== depthGuard) {
      throw new Error(`Refusing unexpected braces depth guard: ${location}`);
    }
    writes.push({ path: guardPath, source: depthGuard });
  }
  // Verify every copy before modifying any copy. Errors intentionally fail postinstall.
  for (const { path, source } of writes) writeFileSync(path, source);
  return installed;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const installed = applyDependencySecurityPatches(root);
  console.log(`Dependency security: verified depth protection in ${installed} installed braces package(s).`);
}
