/**
 * Node module-customisation hooks for running the TypeScript test suite.
 *
 * Node's native type stripping (Node >= 22.6) lets us run `.ts` files
 * directly, but its ESM resolver is strict: a relative import such as
 * `import { x } from "./dose-parse"` has to carry a file extension.
 * The app source follows the extension-less convention that webpack /
 * Next.js expect, so we resolve it here instead of rewriting imports
 * across the codebase.
 *
 * Also maps the "@/..." alias used by tsconfig onto "./src/..." so
 * tests can import application modules the same way the app does.
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";
import { existsSync } from "node:fs";

const PROJECT_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

/** Candidate file names tried for an extension-less relative import. */
const CANDIDATE_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx", ".js"];

function tryPaths(basePath) {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${basePath}${suffix}`;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // ── "@/..." → "<project root>/src/..." ──
  if (specifier.startsWith("@/")) {
    const target = tryPaths(resolvePath(PROJECT_ROOT, "src", specifier.slice(2)));
    if (target) {
      return nextResolve(pathToFileURL(target).href, context);
    }
  }

  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    // ── extension-less relative import → try .ts / /index.ts ──
    if (specifier.startsWith(".") && context.parentURL) {
      const parentDir = dirname(fileURLToPath(context.parentURL));
      const target = tryPaths(resolvePath(parentDir, specifier));
      if (target) {
        return nextResolve(pathToFileURL(target).href, context);
      }
    }
    throw error;
  }
}
