import { verifyViewerKey } from './viewerKey';
import { isPlayableWindow } from './playableWindow';
import { ErrorCode, ErrorType } from './response';

export type AuthorizePlaybackParams = {
  viewerKey: string;
  sharedSecret: string;
  now: Date;
  availableFrom: string | Date | null;
  availableUntil: string | Date | null;
};

export type AuthorizePlaybackResult =
  | {
      authorized: true;
      userId: string;
    }
  | {
      authorized: false;
      httpCode: number;
      errorType: ErrorType;
      errorCode: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };

export function authorizePlayback(params: AuthorizePlaybackParams): AuthorizePlaybackResult {
  const { viewerKey, sharedSecret, now, availableFrom, availableUntil } = params;
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const verification = verifyViewerKey(viewerKey, sharedSecret, nowSeconds);

  if (!verification.valid) {
    const message =
      verification.errorCode === 'VIEWER_KEY_EXPIRED'
        ? 'viewer_key expired'
        : 'viewer_key invalid';

    return {
      authorized: false,
      httpCode: 401,
      errorType: ErrorType.AUTHENTICATION_ERROR,
      errorCode: ErrorCode.INVALID_VIEWER_KEY,
      message,
      details: { reason: verification.errorCode },
    };
  }

  const windowResult = isPlayableWindow(availableFrom, availableUntil, now);

  if (!windowResult.playable) {
    if (windowResult.reason === 'NOT_AVAILABLE_YET') {
      return {
        authorized: false,
        httpCode: 403,
        errorType: ErrorType.BUSINESS_ERROR,
        errorCode: ErrorCode.NOT_AVAILABLE_YET,
        message: 'not available yet',
        details: { availableFrom },
      };
    }

    return {
      authorized: false,
      httpCode: 403,
      errorType: ErrorType.BUSINESS_ERROR,
      errorCode: ErrorCode.EXPIRED,
      message: 'content expired',
      details: { availableUntil },
    };
  }

  return {
    authorized: true,
    userId: verification.userId,
  };
}
