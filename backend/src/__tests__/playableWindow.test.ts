import test from 'node:test';
import assert from 'node:assert/strict';

import { isPlayableWindow } from '../utils/playableWindow';

test('isPlayableWindow returns playable when no bounds', () => {
  const now = new Date('2025-01-01T00:00:00Z');
  const result = isPlayableWindow(null, null, now);
  assert.deepEqual(result, { playable: true });
});

test('isPlayableWindow rejects when before available_from', () => {
  const now = new Date('2025-01-01T00:00:00Z');
  const result = isPlayableWindow('2025-01-02T00:00:00Z', null, now);
  assert.deepEqual(result, { playable: false, reason: 'NOT_AVAILABLE_YET' });
});

test('isPlayableWindow rejects when after available_until', () => {
  const now = new Date('2025-01-03T00:00:00Z');
  const result = isPlayableWindow(null, '2025-01-02T00:00:00Z', now);
  assert.deepEqual(result, { playable: false, reason: 'EXPIRED' });
});

test('isPlayableWindow allows at boundary of available_from', () => {
  const now = new Date('2025-01-02T00:00:00Z');
  const result = isPlayableWindow('2025-01-02T00:00:00Z', null, now);
  assert.deepEqual(result, { playable: true });
});

test('isPlayableWindow allows at boundary of available_until', () => {
  const now = new Date('2025-01-02T00:00:00Z');
  const result = isPlayableWindow(null, '2025-01-02T00:00:00Z', now);
  assert.deepEqual(result, { playable: true });
});

test('isPlayableWindow allows when within window', () => {
  const now = new Date('2025-01-02T12:00:00Z');
  const result = isPlayableWindow('2025-01-02T00:00:00Z', '2025-01-03T00:00:00Z', now);
  assert.deepEqual(result, { playable: true });
});
