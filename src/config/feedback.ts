const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
};

export const RATING_SCALE = Math.min(
  10,
  Math.max(5, parseNumber(process.env.NEXT_PUBLIC_RATING_SCALE, 10))
);

export const TEXT_MAX_LENGTH = Math.min(
  1000,
  Math.max(200, parseNumber(process.env.NEXT_PUBLIC_TEXT_MAX_LENGTH, 300))
);

export const TEXT_MIN_LENGTH = 3;

export const TRUSTED_PREFILL =
  (process.env.NEXT_PUBLIC_TRUSTED_PREFILL ?? "true").toLowerCase() !== "false";

export const SUBMIT_LOCK_DURATION_MS = 5000;

