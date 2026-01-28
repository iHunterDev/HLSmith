import { test, beforeAll, afterAll, beforeEach } from 'vitest';
import assert from 'node:assert/strict';

import { buildViewerKey, verifyViewerKey } from '../utils/viewerKey';

test('verifyViewerKey accepts a valid viewer_key', () => {
  const sharedSecret = 'test-secret';
  const now = 1_700_000_000;
  const issuedAt = now - 10;
  const ttl = 30;
  const viewerKey = buildViewerKey('user-1', issuedAt, ttl, sharedSecret);

  const result = verifyViewerKey(viewerKey, sharedSecret, now);

  assert.deepEqual(result, {
    valid: true,
    userId: 'user-1',
    issuedAt,
    ttl,
  });
});

test('verifyViewerKey rejects expired viewer_key', () => {
  const sharedSecret = 'test-secret';
  const now = 1_700_000_000;
  const issuedAt = now - 100;
  const ttl = 30;
  const viewerKey = buildViewerKey('user-1', issuedAt, ttl, sharedSecret);

  const result = verifyViewerKey(viewerKey, sharedSecret, now);

  assert.deepEqual(result, {
    valid: false,
    errorCode: 'VIEWER_KEY_EXPIRED',
  });
});

test('verifyViewerKey rejects viewer_key with invalid signature', () => {
  const sharedSecret = 'test-secret';
  const now = 1_700_000_000;
  const issuedAt = now - 10;
  const ttl = 30;
  const viewerKey = buildViewerKey('user-1', issuedAt, ttl, 'other-secret');

  const result = verifyViewerKey(viewerKey, sharedSecret, now);

  assert.deepEqual(result, {
    valid: false,
    errorCode: 'INVALID_VIEWER_KEY_SIGNATURE',
  });
});

test('verifyViewerKey rejects malformed viewer_key', () => {
  const sharedSecret = 'test-secret';
  const now = 1_700_000_000;
  const viewerKey = 'not-base64';

  const result = verifyViewerKey(viewerKey, sharedSecret, now);

  assert.deepEqual(result, {
    valid: false,
    errorCode: 'INVALID_VIEWER_KEY_FORMAT',
  });
});
