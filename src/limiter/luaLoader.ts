/**
 * luaLoader.ts
 * ─────────────
 * Reads .lua files from disk and provides them as strings for Redis EVAL/EVALSHA.
 *
 * Why read from disk instead of inlining strings?
 * ─────────────────────────────────────────────────
 * 1. Syntax highlighting & IDE support — .lua files get proper tooling.
 * 2. The lua/ directory is self-documenting: engineers unfamiliar with the
 *    codebase can find and read the algorithm logic without digging into TS.
 * 3. Lua files can be tested independently with redis-cli EVAL during debugging.
 * 4. Keeps TS files clean from multi-hundred-line string literals.
 *
 * EVALSHA caching strategy:
 * ─────────────────────────
 * Redis caches Lua scripts by their SHA1 hash. EVALSHA sends only the 40-byte
 * hash instead of the full script on every call — significant bandwidth saving
 * at high throughput. We cache the SHA after the first SCRIPT LOAD.
 *
 * If Redis restarts and loses the cached scripts, EVALSHA will return NOSCRIPT.
 * The wrappers handle this by falling back to EVAL and re-caching the SHA.
 */
import fs from 'fs';
import path from 'path';

const LUA_DIR = path.join(__dirname, '../lua');

/**
 * Read a Lua script from disk synchronously.
 * Cached in a module-level Map so disk is only read once per script per process.
 */
const scriptCache = new Map<string, string>();

export const loadLuaScript = (filename: string): string => {
  if (scriptCache.has(filename)) {
    return scriptCache.get(filename)!;
  }

  const filepath = path.join(LUA_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf8');
  scriptCache.set(filename, content);
  return content;
};

// Pre-load all scripts at startup for fast access
export const SLIDING_WINDOW_SCRIPT  = loadLuaScript('sliding_window.lua');
export const FIXED_WINDOW_SCRIPT    = loadLuaScript('fixed_window.lua');
export const TOKEN_BUCKET_SCRIPT    = loadLuaScript('token_bucket.lua');
export const LEAKY_BUCKET_SCRIPT    = loadLuaScript('leaky_bucket.lua');
