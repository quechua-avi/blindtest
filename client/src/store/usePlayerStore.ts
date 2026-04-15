import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PlayerStore {
  name: string
  volume: number
  setName: (name: string) => void
  setVolume: (v: number) => void
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      name: '',
      volume: 80,
      setName: (name) => set({ name }),
      setVolume: (volume) => set({ volume }),
    }),
    { name: 'blindtest-player' }
  )
)
