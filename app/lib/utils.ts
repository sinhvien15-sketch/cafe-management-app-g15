/**
 * Races a promise against a timer. Rejects with Error('timeout') if the
 * promise does not resolve within `ms` milliseconds.
 *
 * The Firebase JS SDK retries Firestore writes indefinitely when offline,
 * so every user-visible write must be wrapped here to get a bounded wait.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms),
    ),
  ]);
}
