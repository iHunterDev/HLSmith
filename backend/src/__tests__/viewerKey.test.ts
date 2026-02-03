import { test } from 'vitest';
import assert from 'node:assert/strict';

import { buildViewerKey, verifyViewerKey } from '../utils/viewerKey';

test('verifyViewerKey accepts a valid viewer_key', () => {
  const sharedSecret = 'test-secret';
  const userId = 'user-1';
  const viewerKey = buildViewerKey(userId, 'normal', sharedSecret);

  const result = verifyViewerKey(viewerKey, sharedSecret);

  assert.deepEqual(result, {
    valid: true,
    userId: 'user-1',
    scope: 'normal',
  });
});

test('verifyViewerKey rejects viewer_key with invalid signature', () => {
  const sharedSecret = 'test-secret';
  const viewerKey = buildViewerKey('user-1', 'normal', 'other-secret');

  const result = verifyViewerKey(viewerKey, sharedSecret);

  assert.deepEqual(result, {
    valid: false,
    errorCode: 'INVALID_VIEWER_KEY_SIGNATURE',
  });
});

test('verifyViewerKey rejects malformed viewer_key', () => {
  const viewerKey = 'not-base64';

  const result = verifyViewerKey(viewerKey, 'test-secret');

  assert.deepEqual(result, {
    valid: false,
    errorCode: 'INVALID_VIEWER_KEY_FORMAT',
  });
});

test('verifyViewerKey rejects legacy format viewer_key', () => {
  const raw = 'user-1.legacy-signature';
  const viewerKey = Buffer.from(raw, 'utf8').toString('base64');

  const result = verifyViewerKey(viewerKey, 'test-secret');

  assert.deepEqual(result, {
    valid: false,
    errorCode: 'INVALID_VIEWER_KEY_FORMAT',
  });
});
