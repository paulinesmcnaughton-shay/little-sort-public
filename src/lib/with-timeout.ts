// A network call that REJECTS offline is easy to handle; one that just never
// settles is not. RevenueCat and Supabase both do the second thing on a dead
// connection, and an `await` on one of those freezes whatever comes after it —
// which is how signing out offline could clear the session but never update the
// screen. Anything on a path the player is waiting on gets a deadline here.
export const AUTH_NETWORK_TIMEOUT_MS = 6000;

export function withTimeout<T>(work: Promise<T>, fallback: T, ms = AUTH_NETWORK_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(fallback), ms);
    work.then(finish, () => finish(fallback));
  });
}
