import { test, beforeAll, afterAll, beforeEach } from 'vitest';
import assert from 'node:assert/strict';

import { validateHeartbeat } from '../utils/heartbeatRules';

test('validateHeartbeat accepts first heartbeat when within limits', () => {
  const now = new Date('2025-01-01T00:00:30Z');
  const result = validateHeartbeat({
    previousHeartbeatAt: null,
    deltaSeconds: 15,
    clientTimestamp: new Date('2025-01-01T00:00:15Z'),
    now,
  });

  assert.deepEqual(result, { valid: true });
});

test('validateHeartbeat rejects when interval is too short', () => {
  const now = new Date('2025-01-01T00:00:20Z');
  const result = validateHeartbeat({
    previousHeartbeatAt: new Date('2025-01-01T00:00:10Z'),
    deltaSeconds: 10,
    clientTimestamp: new Date('2025-01-01T00:00:20Z'),
    now,
  });

  assert.deepEqual(result, { valid: false, reason: 'HEARTBEAT_TOO_FREQUENT' });
});

test('validateHeartbeat accepts when interval equals 15s', () => {
  const now = new Date('2025-01-01T00:00:25Z');
  const result = validateHeartbeat({
    previousHeartbeatAt: new Date('2025-01-01T00:00:10Z'),
    deltaSeconds: 15,
    clientTimestamp: new Date('2025-01-01T00:00:25Z'),
    now,
  });

  assert.deepEqual(result, { valid: true });
});

test('validateHeartbeat rejects when deltaSeconds exceeds 20', () => {
  const now = new Date('2025-01-01T00:00:40Z');
  const result = validateHeartbeat({
    previousHeartbeatAt: new Date('2025-01-01T00:00:10Z'),
    deltaSeconds: 21,
    clientTimestamp: new Date('2025-01-01T00:00:40Z'),
    now,
  });

  assert.deepEqual(result, { valid: false, reason: 'DELTA_TOO_LARGE' });
});

test('validateHeartbeat accepts when deltaSeconds equals 20', () => {
  const now = new Date('2025-01-01T00:00:40Z');
  const result = validateHeartbeat({
    previousHeartbeatAt: new Date('2025-01-01T00:00:10Z'),
    deltaSeconds: 20,
    clientTimestamp: new Date('2025-01-01T00:00:40Z'),
    now,
  });

  assert.deepEqual(result, { valid: true });
});

test('validateHeartbeat rejects when client timestamp skew exceeds 2 minutes', () => {
  const now = new Date('2025-01-01T00:05:00Z');
  const result = validateHeartbeat({
    previousHeartbeatAt: null,
    deltaSeconds: 10,
    clientTimestamp: new Date('2025-01-01T00:02:50Z'),
    now,
  });

  assert.deepEqual(result, { valid: false, reason: 'TIMESTAMP_SKEW_TOO_LARGE' });
});

test('validateHeartbeat accepts when client timestamp skew equals 2 minutes', () => {
  const now = new Date('2025-01-01T00:05:00Z');
  const result = validateHeartbeat({
    previousHeartbeatAt: null,
    deltaSeconds: 10,
    clientTimestamp: new Date('2025-01-01T00:03:00Z'),
    now,
  });

  assert.deepEqual(result, { valid: true });
});
