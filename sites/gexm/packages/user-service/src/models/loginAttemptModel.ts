import { getDb } from './index'
import logger from '../utils/logger'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15
const CLEANUP_INTERVAL_HOURS = 24

interface LoginAttempt {
  id: string
  username: string
  attempts: number
  locked_until: string | null
  last_attempt: string
}

const loginAttemptModel = {
  getByUsername(username: string): LoginAttempt | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM login_attempts WHERE username = ?').get(username)
    return result as LoginAttempt | null
  },

  recordAttempt(username: string, success: boolean): { locked: boolean; remainingAttempts: number; lockoutEndTime?: string } {
    const db = getDb()
    const now = new Date()
    const attempt = this.getByUsername(username)

    if (attempt && attempt.locked_until) {
      const lockedUntil = new Date(attempt.locked_until)
      if (now < lockedUntil) {
        return {
          locked: true,
          remainingAttempts: 0,
          lockoutEndTime: lockedUntil.toISOString(),
        }
      }
    }

    if (success) {
      db.prepare('DELETE FROM login_attempts WHERE username = ?').run(username)
      return { locked: false, remainingAttempts: MAX_ATTEMPTS }
    }

    const newAttempts = (attempt?.attempts || 0) + 1

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockoutUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
      if (attempt) {
        db.prepare(
          'UPDATE login_attempts SET attempts = ?, locked_until = ?, last_attempt = ? WHERE username = ?'
        ).run(newAttempts, lockoutUntil.toISOString(), now.toISOString(), username)
      } else {
        db.prepare(
          'INSERT INTO login_attempts (username, attempts, locked_until, last_attempt) VALUES (?, ?, ?, ?)'
        ).run(username, newAttempts, lockoutUntil.toISOString(), now.toISOString())
      }
      logger.warn('Account locked due to too many failed login attempts: %s', username)
      return {
        locked: true,
        remainingAttempts: 0,
        lockoutEndTime: lockoutUntil.toISOString(),
      }
    }

    if (attempt) {
      db.prepare(
        'UPDATE login_attempts SET attempts = ?, last_attempt = ? WHERE username = ?'
      ).run(newAttempts, now.toISOString(), username)
    } else {
      db.prepare(
        'INSERT INTO login_attempts (username, attempts, locked_until, last_attempt) VALUES (?, ?, NULL, ?)'
      ).run(username, newAttempts, now.toISOString())
    }

    return { locked: false, remainingAttempts: MAX_ATTEMPTS - newAttempts }
  },

  unlockAccount(username: string): void {
    const db = getDb()
    db.prepare('DELETE FROM login_attempts WHERE username = ?').run(username)
  },

  cleanupOldAttempts(): void {
    const db = getDb()
    const cutoffTime = new Date(Date.now() - CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000)
    db.prepare('DELETE FROM login_attempts WHERE last_attempt < ?').run(cutoffTime.toISOString())
  },
}

export default loginAttemptModel
