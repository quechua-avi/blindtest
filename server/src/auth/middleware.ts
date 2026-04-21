import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { CONFIG } from '../config'

export interface AuthRequest extends Request {
  userId?: number
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), CONFIG.JWT_SECRET) as { userId: number }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
}
