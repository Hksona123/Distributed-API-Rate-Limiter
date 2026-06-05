/**
 * sanitizeKey.test.ts — UPGRADE 5: Unit Tests for Key Sanitization
 * ══════════════════════════════════════════════════════════════════
 * 
 * Tests cover:
 *   ✅ Normal valid input
 *   ✅ Injection attempt (CRLF, FLUSHDB, null bytes)
 *   ✅ Oversized key
 *   ✅ Empty string
 *   ✅ Unicode input
 *   ✅ Hash-tag keys (valid for cluster mode)
 *   ✅ Custom maxLength override
 *   ✅ Error code typing (KEY_INVALID, KEY_TOO_LONG, KEY_EMPTY)
 */

import { sanitizeKey, sanitizeIdentifier, RateLimiterError } from '../utils/sanitizeKey';

describe('sanitizeKey — Input Validation', () => {

  // ── NORMAL INPUT ────────────────────────────────────────────────────────────

  it('passes a normal IP-based key', () => {
    expect(sanitizeKey('1.2.3.4')).toBe('1.2.3.4');
  });

  it('passes a normal user ID key', () => {
    expect(sanitizeKey('user-123')).toBe('user-123');
  });

  it('passes a full namespaced Redis key', () => {
    expect(sanitizeKey('rl:ip:1.2.3.4:public')).toBe('rl:ip:1.2.3.4:public');
  });

  it('passes a cluster hash-tag key', () => {
    expect(sanitizeKey('rl:{ip:1.2.3.4}:public')).toBe('rl:{ip:1.2.3.4}:public');
  });

  it('passes an API key with allowed characters', () => {
    expect(sanitizeKey('sk-prod-abc123_XYZ-key')).toBe('sk-prod-abc123_XYZ-key');
  });

  it('passes a key with underscores and dots', () => {
    expect(sanitizeKey('service_name.v2')).toBe('service_name.v2');
  });

  // ── INJECTION ATTACKS ───────────────────────────────────────────────────────

  it('blocks CRLF injection attempt', () => {
    expect(() => sanitizeKey('1.2.3.4\r\nFLUSHDB\r\n')).toThrow(RateLimiterError);
    expect(() => sanitizeKey('1.2.3.4\r\nFLUSHDB\r\n')).toThrow(
      expect.objectContaining({ code: 'KEY_INVALID' })
    );
  });

  it('blocks null byte injection', () => {
    expect(() => sanitizeKey('user\x00admin')).toThrow(RateLimiterError);
    expect(() => sanitizeKey('user\x00admin')).toThrow(
      expect.objectContaining({ code: 'KEY_INVALID' })
    );
  });

  it('blocks semicolon command chaining attempt', () => {
    expect(() => sanitizeKey('user;FLUSHALL')).toThrow(RateLimiterError);
    expect(() => sanitizeKey('user;FLUSHALL')).toThrow(
      expect.objectContaining({ code: 'KEY_INVALID' })
    );
  });

  it('blocks space characters (protocol breaking)', () => {
    expect(() => sanitizeKey('user id with spaces')).toThrow(RateLimiterError);
    expect(() => sanitizeKey('user id with spaces')).toThrow(
      expect.objectContaining({ code: 'KEY_INVALID' })
    );
  });

  it('blocks backslash path traversal attempts', () => {
    expect(() => sanitizeKey('../../etc/passwd')).toThrow(RateLimiterError);
  });

  it('returns KEY_INVALID error code on injection', () => {
    try {
      sanitizeKey('bad\ninput');
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimiterError);
      expect((e as RateLimiterError).code).toBe('KEY_INVALID');
      expect((e as RateLimiterError).statusCode).toBe(400);
    }
  });

  // ── OVERSIZED KEY ───────────────────────────────────────────────────────────

  it('blocks keys exceeding default 256 char limit', () => {
    const longKey = 'a'.repeat(257);
    expect(() => sanitizeKey(longKey)).toThrow(RateLimiterError);
    expect(() => sanitizeKey(longKey)).toThrow(
      expect.objectContaining({ code: 'KEY_TOO_LONG' })
    );
  });

  it('passes a key exactly at the 256 char limit', () => {
    const atLimit = 'a'.repeat(256);
    expect(sanitizeKey(atLimit)).toBe(atLimit);
  });

  it('respects custom maxLength override', () => {
    expect(() => sanitizeKey('abc', { maxLength: 2 })).toThrow(
      expect.objectContaining({ code: 'KEY_TOO_LONG' })
    );
    expect(sanitizeKey('ab', { maxLength: 2 })).toBe('ab');
  });

  // ── EMPTY STRING ────────────────────────────────────────────────────────────

  it('blocks empty string', () => {
    expect(() => sanitizeKey('')).toThrow(RateLimiterError);
    expect(() => sanitizeKey('')).toThrow(
      expect.objectContaining({ code: 'KEY_EMPTY' })
    );
  });

  // ── UNICODE INPUT ───────────────────────────────────────────────────────────

  it('blocks unicode characters (emoji)', () => {
    expect(() => sanitizeKey('user:🔥:hack')).toThrow(RateLimiterError);
    expect(() => sanitizeKey('user:🔥:hack')).toThrow(
      expect.objectContaining({ code: 'KEY_INVALID' })
    );
  });

  it('blocks CJK characters', () => {
    expect(() => sanitizeKey('用户:123')).toThrow(RateLimiterError);
  });

  it('blocks Arabic characters', () => {
    expect(() => sanitizeKey('مستخدم:123')).toThrow(RateLimiterError);
  });

  // ── sanitizeIdentifier HELPER ───────────────────────────────────────────────

  it('sanitizeIdentifier uses fallback when input is undefined', () => {
    expect(sanitizeIdentifier(undefined, 'anonymous')).toBe('anonymous');
  });

  it('sanitizeIdentifier uses fallback when input is null', () => {
    expect(sanitizeIdentifier(null, 'anonymous')).toBe('anonymous');
  });

  it('sanitizeIdentifier returns valid input unchanged', () => {
    expect(sanitizeIdentifier('user-42', 'anonymous')).toBe('user-42');
  });

  it('sanitizeIdentifier throws when input is invalid', () => {
    expect(() => sanitizeIdentifier('bad\x00input', 'fallback')).toThrow(RateLimiterError);
  });

  // ── ERROR SHAPE ─────────────────────────────────────────────────────────────

  it('error is instanceof RateLimiterError', () => {
    try {
      sanitizeKey('\n');
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimiterError);
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('error has correct name property', () => {
    try {
      sanitizeKey('\n');
    } catch (e: any) {
      expect(e.name).toBe('RateLimiterError');
    }
  });
});
