import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db/database'
import { CONFIG } from '../config'
import { authMiddleware, type AuthRequest } from './middleware'

export const authRouter = Router()

function signToken(userId: number) {
  return jwt.sign({ userId }, CONFIG.JWT_SECRET, { expiresIn: '30d' })
}

function sanitizeUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
  }
}

// POST /api/auth/register
authRouter.post('/register', (req: Request, res: Response) => {
  const { email, password, username } = req.body ?? {}
  if (!email || !password || !username) {
    res.status(400).json({ error: 'Email, mot de passe et pseudo requis' })
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
    res.status(400).json({ error: 'Adresse email invalide' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Mot de passe trop court (6 caractères min)' })
    return
  }
  if (username.trim().length < 2 || username.trim().length > 20) {
    res.status(400).json({ error: 'Pseudo entre 2 et 20 caractères' })
    return
  }

  const hash = bcrypt.hashSync(password, 10)
  try {
    const stmt = db.prepare(
      'INSERT INTO users (email, password, username, avatar_color) VALUES (?, ?, ?, ?)'
    )
    const result = stmt.run(email.trim().toLowerCase(), hash, username.trim(), '#7c3aed')
    const userId = result.lastInsertRowid as number
    db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(userId)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>
    res.status(201).json({ token: signToken(userId), user: sanitizeUser(user) })
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string }
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const msg = e.message?.includes('users.username') ? 'Pseudo déjà utilisé' : 'Email déjà utilisé'
      res.status(409).json({ error: msg })
    } else {
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }
})

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as Record<string, unknown> | undefined
  if (!user || !bcrypt.compareSync(password, user.password as string)) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    return
  }

  db.prepare('UPDATE users SET last_login = unixepoch() WHERE id = ?').run(user.id as number)
  res.json({ token: signToken(user.id as number), user: sanitizeUser(user) })
})

// GET /api/auth/me
authRouter.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as Record<string, unknown> | undefined
  if (!user) { res.status(404).json({ error: 'Utilisateur introuvable' }); return }

  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(req.userId) as Record<string, unknown> | undefined
  res.json({ user: sanitizeUser(user), stats })
})

// PUT /api/auth/me — update profile
authRouter.put('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const { username, avatarColor } = req.body ?? {}
  if (username !== undefined) {
    if (username.trim().length < 2 || username.trim().length > 20) {
      res.status(400).json({ error: 'Pseudo entre 2 et 20 caractères' })
      return
    }
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username.trim(), req.userId)
  }
  if (avatarColor !== undefined) {
    db.prepare('UPDATE users SET avatar_color = ? WHERE id = ?').run(avatarColor, req.userId)
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as Record<string, unknown>
  res.json({ user: sanitizeUser(user) })
})

// PUT /api/auth/me/password — change password
authRouter.put('/me/password', authMiddleware, (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {}
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' })
    return
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Nouveau mot de passe trop court (6 caractères min)' })
    return
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as Record<string, unknown> | undefined
  if (!user || !bcrypt.compareSync(currentPassword, user.password as string)) {
    res.status(401).json({ error: 'Mot de passe actuel incorrect' })
    return
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.userId)
  res.json({ ok: true })
})

// DELETE /api/auth/me — delete own account
authRouter.delete('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const { password } = req.body ?? {}
  if (!password) {
    res.status(400).json({ error: 'Mot de passe requis pour confirmer la suppression' })
    return
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as Record<string, unknown> | undefined
  if (!user || !bcrypt.compareSync(password, user.password as string)) {
    res.status(401).json({ error: 'Mot de passe incorrect' })
    return
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.userId)
  res.json({ ok: true })
})
