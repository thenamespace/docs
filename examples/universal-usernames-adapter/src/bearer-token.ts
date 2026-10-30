import { createHash, timingSafeEqual } from 'node:crypto';

const BEARER = /^Bearer\s+(.+)$/i;

/** Checks an Authorization header against the expected bearer token in constant time. */
export function isAuthorizedBearer(header: string | undefined, expectedToken: string): boolean {
  const presented = header?.match(BEARER)?.[1];
  if (!presented) return false;

  // Hashing both sides gives timingSafeEqual equal-length inputs, so the
  // comparison time reveals neither the token nor its length.
  return timingSafeEqual(sha256(presented), sha256(expectedToken));
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
