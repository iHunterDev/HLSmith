import crypto from 'node:crypto';

export type ViewerKeyVerificationResult =
  | {
      valid: true;
      userId: string;
      scope: ViewerKeyScope;
    }
  | {
      valid: false;
      errorCode: 'INVALID_VIEWER_KEY_FORMAT' | 'INVALID_VIEWER_KEY_SIGNATURE';
    };

export type ViewerKeyScope = 'normal' | 'unlimited';

type ParsedViewerKey = {
  userId: string;
  scope: ViewerKeyScope;
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
  if (parts.length !== 3) {
    return null;
  }

  const [userId, scopeRaw, signature] = parts;

  if (!userId || !scopeRaw || !signature) {
    return null;
  }

  if (scopeRaw !== 'normal' && scopeRaw !== 'unlimited') {
    return null;
  }

  return { userId, scope: scopeRaw, signature };
}

function computeSignature(userId: string, scope: ViewerKeyScope, sharedSecret: string): string {
  return crypto.createHmac('sha256', sharedSecret).update(`${userId}|${scope}`).digest('hex');
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

  const { userId, scope, signature } = parsed;
  const expected = computeSignature(userId, scope, sharedSecret);

  if (!safeEqualHex(signature, expected)) {
    return { valid: false, errorCode: 'INVALID_VIEWER_KEY_SIGNATURE' };
  }

  return { valid: true, userId, scope };
}

export function buildViewerKey(userId: string, scope: ViewerKeyScope, sharedSecret: string): string {
  const signature = computeSignature(userId, scope, sharedSecret);
  const raw = `${userId}.${scope}.${signature}`;
  return Buffer.from(raw, 'utf8').toString('base64');
}
