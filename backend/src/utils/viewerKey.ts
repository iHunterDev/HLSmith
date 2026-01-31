import crypto from 'node:crypto';

export type ViewerKeyVerificationResult =
  | {
      valid: true;
      userId: string;
    }
  | {
      valid: false;
      errorCode: 'INVALID_VIEWER_KEY_FORMAT' | 'INVALID_VIEWER_KEY_SIGNATURE';
    };

type ParsedViewerKey = {
  userId: string;
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
  if (parts.length !== 2) {
    return null;
  }

  const [userId, signature] = parts;

  if (!userId || !signature) {
    return null;
  }

  return { userId, signature };
}

function computeSignature(userId: string, sharedSecret: string): string {
  return crypto.createHmac('sha256', sharedSecret).update(userId).digest('hex');
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
): ViewerKeyVerificationResult {
  const parsed = parseViewerKey(viewerKey);
  if (!parsed) {
    return { valid: false, errorCode: 'INVALID_VIEWER_KEY_FORMAT' };
  }

  const { userId, signature } = parsed;
  const expected = computeSignature(userId, sharedSecret);

  if (!safeEqualHex(signature, expected)) {
    return { valid: false, errorCode: 'INVALID_VIEWER_KEY_SIGNATURE' };
  }

  return { valid: true, userId };
}

export function buildViewerKey(userId: string, sharedSecret: string): string {
  const signature = computeSignature(userId, sharedSecret);
  const raw = `${userId}.${signature}`;
  return Buffer.from(raw, 'utf8').toString('base64');
}
