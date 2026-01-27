export type HeartbeatValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason: 'HEARTBEAT_TOO_FREQUENT' | 'DELTA_TOO_LARGE' | 'TIMESTAMP_SKEW_TOO_LARGE';
    };

type HeartbeatValidationInput = {
  previousHeartbeatAt: Date | null;
  deltaSeconds: number;
  clientTimestamp: Date;
  now: Date;
};

const MIN_INTERVAL_SECONDS = 15;
const MAX_DELTA_SECONDS = 20;
const MAX_SKEW_SECONDS = 120;

export function validateHeartbeat(input: HeartbeatValidationInput): HeartbeatValidationResult {
  const { previousHeartbeatAt, deltaSeconds, clientTimestamp, now } = input;

  if (previousHeartbeatAt) {
    const intervalSeconds = (now.getTime() - previousHeartbeatAt.getTime()) / 1000;
    if (intervalSeconds < MIN_INTERVAL_SECONDS) {
      return { valid: false, reason: 'HEARTBEAT_TOO_FREQUENT' };
    }
  }

  if (deltaSeconds > MAX_DELTA_SECONDS) {
    return { valid: false, reason: 'DELTA_TOO_LARGE' };
  }

  const skewSeconds = Math.abs(now.getTime() - clientTimestamp.getTime()) / 1000;
  if (skewSeconds > MAX_SKEW_SECONDS) {
    return { valid: false, reason: 'TIMESTAMP_SKEW_TOO_LARGE' };
  }

  return { valid: true };
}
