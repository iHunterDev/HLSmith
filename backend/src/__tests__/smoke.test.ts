import { test, beforeAll, afterAll, beforeEach } from 'vitest';
import assert from 'node:assert/strict';

test('test runner boots', () => {
  assert.equal(1 + 1, 2);
});
