/**
 * Registers the TypeScript resolution hooks with Node.
 *
 * Usage:
 *   npm test
 */

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-hooks.mjs", pathToFileURL(import.meta.filename));
