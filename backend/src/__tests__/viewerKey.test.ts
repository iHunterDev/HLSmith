import { test } from 'vitest';
import assert from 'node:assert/strict';

import { buildViewerKey, verifyViewerKey } from '../utils/viewerKey';

test('verifyViewerKey accepts a valid viewer_key', () => {
  const sharedSecret = 'test-secret';
  const userId = 'user-1';
  const viewerKey = buildViewerKey(userId, sharedSecret);

  const result = verifyViewerKey(viewerKey, sharedSecret);

  assert.deepEqual(result, {
    valid: true,
    userId: 'user-1',
  });
});

test('verifyViewerKey rejects viewer_key with invalid signature', () => {
  const sharedSecret = 'test-secret';
  const viewerKey = buildViewerKey('user-1', 'other-secret');

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
