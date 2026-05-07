/**
 * PER-USER FLUX CONCURRENCY LIMITER
 *
 * Caps the number of in-flight FLUX try-on jobs per user. Without this,
 * a single user firing 20 requests in a row could occupy every key in
 * the pool and starve every other user.
 *
 * Default: 2 concurrent jobs per user. Tunable via FLUX_PER_USER_MAX.
 *
 * This is in-memory only (per Node process). For multi-instance
 * deployments, swap the Map for a Redis SETNX-based limiter.
 */

import 'server-only'

const PER_USER_MAX = Number(process.env.FLUX_PER_USER_MAX || 2)

/** userId → in-flight count */
const userInFlight = new Map<string, number>()

export class UserConcurrencyError extends Error {
  constructor(public readonly userId: string, public readonly current: number, public readonly cap: number) {
    super(`User ${userId} has ${current} concurrent generations, cap is ${cap}`)
    this.name = 'UserConcurrencyError'
  }
}

/**
 * Try to reserve a slot for the user. Throws UserConcurrencyError if the
 * user is already at the cap. Returns a release() the caller MUST call
 * (in finally) to free the slot.
 */
export function reserveUserSlot(userId: string): { release: () => void } {
  const current = userInFlight.get(userId) || 0
  if (current >= PER_USER_MAX) {
    throw new UserConcurrencyError(userId, current, PER_USER_MAX)
  }
  userInFlight.set(userId, current + 1)
  let released = false
  return {
    release: () => {
      if (released) return
      released = true
      const cur = userInFlight.get(userId) || 0
      if (cur <= 1) userInFlight.delete(userId)
      else userInFlight.set(userId, cur - 1)
    },
  }
}

/** Read-only check — does NOT reserve. */
export function getUserInFlight(userId: string): number {
  return userInFlight.get(userId) || 0
}

export function getUserConcurrencyCap(): number {
  return PER_USER_MAX
}

/** Diagnostic: total active users + total in-flight across all users. */
export function getUserConcurrencyStats(): { activeUsers: number; totalInFlight: number; cap: number } {
  let total = 0
  for (const v of userInFlight.values()) total += v
  return { activeUsers: userInFlight.size, totalInFlight: total, cap: PER_USER_MAX }
}
