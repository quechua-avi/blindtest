import { db } from '../db/database'

export interface GameResultForUser {
  userId: number
  score: number
  correctAnswers: number
  bestStreak: number
  isWinner: boolean
}

export function updateUserStats(results: GameResultForUser[]) {
  const stmt = db.prepare(`
    UPDATE user_stats SET
      games_played    = games_played + 1,
      games_won       = games_won + ?,
      total_score     = total_score + ?,
      best_score      = MAX(best_score, ?),
      correct_answers = correct_answers + ?,
      best_streak     = MAX(best_streak, ?)
    WHERE user_id = ?
  `)

  const update = db.transaction((rows: GameResultForUser[]) => {
    for (const r of rows) {
      stmt.run(r.isWinner ? 1 : 0, r.score, r.score, r.correctAnswers, r.bestStreak, r.userId)
    }
  })

  update(results)
}

export function getUserById(userId: number) {
  return db.prepare('SELECT id, email, username, avatar_color FROM users WHERE id = ?').get(userId) as
    | { id: number; email: string; username: string; avatar_color: string }
    | undefined
}
