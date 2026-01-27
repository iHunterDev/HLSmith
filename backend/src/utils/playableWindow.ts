export type PlayableWindowResult =
  | {
      playable: true;
    }
  | {
      playable: false;
      reason: 'NOT_AVAILABLE_YET' | 'EXPIRED';
    };

function toTimestamp(value: string | Date | null): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

export function isPlayableWindow(
  availableFrom: string | Date | null,
  availableUntil: string | Date | null,
  now: Date,
): PlayableWindowResult {
  const nowMs = now.getTime();
  const fromMs = toTimestamp(availableFrom);
  const untilMs = toTimestamp(availableUntil);

  if (fromMs !== null && nowMs < fromMs) {
    return { playable: false, reason: 'NOT_AVAILABLE_YET' };
  }

  if (untilMs !== null && nowMs > untilMs) {
    return { playable: false, reason: 'EXPIRED' };
  }

  return { playable: true };
}
