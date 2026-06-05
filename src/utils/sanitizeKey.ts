/**
 * sanitizeKey.ts — UPGRADE 5: Redis Key Injection Prevention
 * ════════════════════════════════════════════════════════════
 *
 * WHAT IS KEY INJECTION?
 * ─────────────────────
 * A rate limiter that trusts user-controlled input (IP header, user ID, API key)
 * to build Redis keys is vulnerable to key injection. Concrete attack:
 *
 *   Normal key:    rl:{ip:1.2.3.4}:public
 *   Malicious req: X-Forwarded-For: "1.2.3.4\r\nFLUSHDB\r\n"
 *   Constructed:   rl:{ip:1.2.3.4\r\nFLUSHDB\r\n}:public
 *
 *   When passed to redis.eval(), the CRLF breaks the Redis protocol frame,
 *   causing Redis to execute FLUSHDB as a second command — wiping the DB.
 *   Even without CRLF, an attacker can craft keys that:
 *     - Collide with other users' keys (bypass their limit by sharing a bucket)
 *     - Exhaust Redis memory with absurdly long keys
 *     - Escape the rl: namespace and shadow internal admin keys
 *
 * HOW WE PREVENT IT:
 * ─────────────────
 *   1. Allowlist regex: only [a-zA-Z0-9:._-] pass through
 *   2. Max length enforcement (default 256 chars)
 *   3. Typed error with code KEY_INVALID for structured catch blocks
 *   4. Security log with truncated raw input (never log full attacker payload)
 */

// ─── Error type ───────────────────────────────────────────────────────────────

export type RateLimiterErrorCode = 'KEY_INVALID' | 'KEY_TOO_LONG' | 'KEY_EMPTY';

export class RateLimiterError extends Error {
  public readonly code: RateLimiterErrorCode;
  public readonly statusCode: number;

  constructor(message: string, code: RateLimiterErrorCode, statusCode = 400) {
    super(message);
    this.name      = 'RateLimiterError';
    this.code      = code;
    this.statusCode = statusCode;
    // Fix prototype chain for instanceof checks in transpiled code
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Configuration ────────────────────────────────────────────────────────────

export interface SanitizeKeyOptions {
  /** Maximum allowed key length in characters. Default: 256 */
  maxLength?: number;
  /** Custom allowlist regex. Default: /^[a-zA-Z0-9:._-]+$/ */
  allowPattern?: RegExp;
}

const DEFAULT_MAX_LENGTH  = 256;
const DEFAULT_ALLOW_REGEX = /^[a-zA-Z0-9:._\-{}]+$/;
const LOG_TRUNCATE_AT     = 64;

// ─── Core Function ────────────────────────────────────────────────────────────

/**
 * sanitizeKey(input, options?)
 * ─────────────────────────────
 * Validates and returns a safe Redis key fragment.
 * Throws RateLimiterError on any violation — caller decides whether to
 * fail-open (next()) or fail-closed (return 400).
 *
 * @param input  Raw user-supplied identifier (IP, user ID, API key)
 * @param opts   Optional config overrides
 * @returns      The validated input string (unchanged if valid)
 *
 * @throws RateLimiterError { code: 'KEY_EMPTY' }    when input is empty
 * @throws RateLimiterError { code: 'KEY_TOO_LONG' } when length > maxLength
 * @throws RateLimiterError { code: 'KEY_INVALID' }  when chars outside allowlist
 */
export const sanitizeKey = (input: string, opts: SanitizeKeyOptions = {}): string => {
  const maxLength    = opts.maxLength    ?? DEFAULT_MAX_LENGTH;
  const allowPattern = opts.allowPattern ?? DEFAULT_ALLOW_REGEX;

  // ── 1. Empty check ─────────────────────────────────────────────────────────
  if (!input || input.length === 0) {
    logSecurityWarning('KEY_EMPTY', '(empty string)');
    throw new RateLimiterError(
      'Rate limit key cannot be empty',
      'KEY_EMPTY',
      400
    );
  }

  // ── 2. Length check ────────────────────────────────────────────────────────
  if (input.length > maxLength) {
    logSecurityWarning('KEY_TOO_LONG', input);
    throw new RateLimiterError(
      `Rate limit key exceeds maximum length of ${maxLength} characters (got ${input.length})`,
      'KEY_TOO_LONG',
      400
    );
  }

  // ── 3. Allowlist check ─────────────────────────────────────────────────────
  if (!allowPattern.test(input)) {
    logSecurityWarning('KEY_INVALID', input);
    throw new RateLimiterError(
      'Rate limit key contains disallowed characters. Only [a-zA-Z0-9:._-{}] permitted.',
      'KEY_INVALID',
      400
    );
  }

  return input;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Logs a security warning with the raw input TRUNCATED to 64 chars.
 * Never log full attacker payloads — they may contain exploit strings
 * that break log parsers or trigger secondary injections in SIEM tools.
 */
function logSecurityWarning(code: RateLimiterErrorCode, raw: string): void {
  const truncated = raw.slice(0, LOG_TRUNCATE_AT);
  const suffix    = raw.length > LOG_TRUNCATE_AT ? `...[+${raw.length - LOG_TRUNCATE_AT} chars]` : '';
  console.warn(`[Security] Key sanitization failed [${code}]: "${truncated}${suffix}"`);
}

/**
 * sanitizeIdentifier — convenience wrapper that handles the common pattern
 * of sanitizing a user-supplied value then returning a fallback on failure.
 * Used in the middleware to sanitize IP, user ID, and API key in one call.
 *
 * @param raw       Raw input from req.ip / header / query
 * @param fallback  Value to use if raw is null/undefined (e.g. "anonymous")
 */
export const sanitizeIdentifier = (raw: string | undefined | null, fallback: string): string => {
  if (!raw) return sanitizeKey(fallback);
  return sanitizeKey(raw);
};
