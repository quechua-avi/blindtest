import { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'

export function useCountdown() {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const currentRound = useGameStore((s) => s.currentRound)

  const timeLimit = currentRound?.timeLimit ?? 20
  const progress = timeLimit > 0 ? timeRemaining / timeLimit : 0
  const isUrgent = timeRemaining <= 5 && timeRemaining > 0

  // SVG circle progress
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  return { timeRemaining, progress, isUrgent, radius, circumference, strokeDashoffset }
}
