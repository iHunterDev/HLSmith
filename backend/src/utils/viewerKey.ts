import crypto from 'node:crypto';

export type ViewerKeyVerificationResult =
  | {
      valid: true;
      userId: string;
      issuedAt: number;
      ttl: number;
    }
  | {
      valid: false;
      errorCode: 'INVALID_VIEWER_KEY_FORMAT' | 'INVALID_VIEWER_KEY_SIGNATURE' | 'VIEWER_KEY_EXPIRED';
    };

type ParsedViewerKey = {
  userId: string;
  issuedAt: number;
  ttl: number;
  signature: string;
};

function parseViewerKey(viewerKey: string): ParsedViewerKey | null {
  let decoded: string;
  try {
    decoded = Buffer.from(viewerKey, 'base64').toString('utf8');
  } catch {
    return null;
  }

  const parts = decoded.split('.');
  if (parts.length !== 4) {
    return null;
  }

  const [userId, issuedAtRaw, ttlRaw, signature] = parts;
  const issuedAt = Number(issuedAtRaw);
  const ttl = Number(ttlRaw);

  if (!userId || !Number.isFinite(issuedAt) || !Number.isFinite(ttl) || !signature) {
    return null;
  }

  return { userId, issuedAt, ttl, signature };
}

function computeSignature(userId: string, issuedAt: number, ttl: number, sharedSecret: string): string {
  const payload = `${userId}|${issuedAt}|${ttl}`;
  return crypto.createHmac('sha256', sharedSecret).update(payload).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function verifyViewerKey(
  viewerKey: string,
  sharedSecret: string,
  nowSeconds: number,
): ViewerKeyVerificationResult {
  const parsed = parseViewerKey(viewerKey);
  if (!parsed) {
    return { valid: false, errorCode: 'INVALID_VIEWER_KEY_FORMAT' };
  }

  const { userId, issuedAt, ttl, signature } = parsed;
  const expected = computeSignature(userId, issuedAt, ttl, sharedSecret);

  if (!safeEqualHex(signature, expected)) {
    return { valid: false, errorCode: 'INVALID_VIEWER_KEY_SIGNATURE' };
  }

  if (issuedAt + ttl < nowSeconds) {
    return { valid: false, errorCode: 'VIEWER_KEY_EXPIRED' };
  }

  return { valid: true, userId, issuedAt, ttl };
}

export function buildViewerKey(userId: string, issuedAt: number, ttl: number, sharedSecret: string): string {
  const signature = computeSignature(userId, issuedAt, ttl, sharedSecret);
  const raw = `${userId}.${issuedAt}.${ttl}.${signature}`;
  return Buffer.from(raw, 'utf8').toString('base64');
}
