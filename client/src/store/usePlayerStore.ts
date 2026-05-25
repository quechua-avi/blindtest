import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const AVATAR_COLORS = [
  '#0891b2', '#06b6d4', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#3b82f6', '#84cc16',
  '#f97316', '#d946ef', '#15803d', '#14b8a6',
]

function randomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

interface PlayerStore {
  name: string
  avatarColor: string
  volume: number
  setName: (name: string) => void
  setAvatarColor: (color: string) => void
  setVolume: (v: number) => void
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      name: '',
      avatarColor: randomColor(),
      volume: 80,
      setName: (name) => set({ name }),
      setAvatarColor: (avatarColor) => set({ avatarColor }),
      setVolume: (volume) => set({ volume }),
    }),
    { name: 'blindtest-player' }
  )
)
