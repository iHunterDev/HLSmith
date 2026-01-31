import { test } from 'vitest';
import assert from 'node:assert/strict';

import { authorizePlayback } from '../utils/authorizePlayback';
import { buildViewerKey } from '../utils/viewerKey';
import { ErrorCode, ErrorType } from '../utils/response';

test('authorizePlayback accepts when viewer_key valid and window open', () => {
  const sharedSecret = 'test-secret';
  const now = new Date(1_700_000_000 * 1000);
  const viewerKey = buildViewerKey('user-1', sharedSecret);

  const result = authorizePlayback({
    viewerKey,
    sharedSecret,
    now,
    availableFrom: null,
    availableUntil: null,
  });

  assert.deepEqual(result, {
    authorized: true,
    userId: 'user-1',
  });
});

test('authorizePlayback rejects invalid viewer_key', () => {
  const sharedSecret = 'test-secret';
  const now = new Date(1_700_000_000 * 1000);

  const result = authorizePlayback({
    viewerKey: 'not-base64',
    sharedSecret,
    now,
    availableFrom: null,
    availableUntil: null,
  });

  assert.deepEqual(result, {
    authorized: false,
    httpCode: 401,
    errorType: ErrorType.AUTHENTICATION_ERROR,
    errorCode: ErrorCode.INVALID_VIEWER_KEY,
    message: 'viewer_key invalid',
    details: { reason: 'INVALID_VIEWER_KEY_FORMAT' },
  });
});

test('authorizePlayback rejects when not available yet', () => {
  const sharedSecret = 'test-secret';
  const now = new Date(1_700_000_000 * 1000);
  const viewerKey = buildViewerKey('user-1', sharedSecret);
  const availableFrom = new Date(now.getTime() + 60_000);

  const result = authorizePlayback({
    viewerKey,
    sharedSecret,
    now,
    availableFrom,
    availableUntil: null,
  });

  assert.deepEqual(result, {
    authorized: false,
    httpCode: 403,
    errorType: ErrorType.BUSINESS_ERROR,
    errorCode: ErrorCode.NOT_AVAILABLE_YET,
    message: 'not available yet',
    details: { availableFrom },
  });
});

test('authorizePlayback rejects when window expired', () => {
  const sharedSecret = 'test-secret';
  const now = new Date(1_700_000_000 * 1000);
  const viewerKey = buildViewerKey('user-1', sharedSecret);
  const availableUntil = new Date(now.getTime() - 60_000);

  const result = authorizePlayback({
    viewerKey,
    sharedSecret,
    now,
    availableFrom: null,
    availableUntil,
  });

  assert.deepEqual(result, {
    authorized: false,
    httpCode: 403,
    errorType: ErrorType.BUSINESS_ERROR,
    errorCode: ErrorCode.EXPIRED,
    message: 'content expired',
    details: { availableUntil },
  });
});
