import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: number
  email: string
  username: string
  avatarColor: string
}

export interface UserStats {
  games_played: number
  games_won: number
  total_score: number
  best_score: number
  correct_answers: number
  best_streak: number
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  stats: UserStats | null
  setAuth: (token: string, user: AuthUser) => void
  setStats: (stats: UserStats) => void
  updateUser: (partial: Partial<AuthUser>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      stats: null,
      setAuth: (token, user) => set({ token, user }),
      setStats: (stats) => set({ stats }),
      updateUser: (partial) => set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),
      logout: () => set({ token: null, user: null, stats: null }),
    }),
    { name: 'beatblind-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
)
