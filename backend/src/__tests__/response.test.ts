import { test, beforeAll, afterAll, beforeEach } from 'vitest';
import assert from 'node:assert/strict';

import { ApiResponseUtil, ErrorCode, ErrorType } from '../utils/response';

type MockResponse = {
  statusCode?: number;
  payload?: any;
  status: (code: number) => MockResponse;
  json: (payload: any) => MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      return this;
    },
  };
}

test('ApiResponseUtil.error includes standard error shape', () => {
  const res = createMockResponse();

  ApiResponseUtil.error(
    res as any,
    401,
    ErrorType.AUTHENTICATION_ERROR,
    ErrorCode.INVALID_VIEWER_KEY,
    'viewer_key invalid',
    { reason: 'bad-signature' },
  );

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.code, 401);
  assert.equal(res.payload.message, 'viewer_key invalid');
  assert.equal(res.payload.error.type, ErrorType.AUTHENTICATION_ERROR);
  assert.equal(res.payload.error.code, ErrorCode.INVALID_VIEWER_KEY);
  assert.equal(res.payload.error.message, 'viewer_key invalid');
  assert.deepEqual(res.payload.error.details, { reason: 'bad-signature' });
  assert.equal(typeof res.payload.timestamp, 'string');
  assert.ok(Number.isFinite(Date.parse(res.payload.timestamp)));
});

test('ApiResponseUtil.businessError uses business error type', () => {
  const res = createMockResponse();

  ApiResponseUtil.businessError(
    res as any,
    ErrorCode.NOT_AVAILABLE_YET,
    'not available',
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.type, ErrorType.BUSINESS_ERROR);
  assert.equal(res.payload.error.code, ErrorCode.NOT_AVAILABLE_YET);
});
