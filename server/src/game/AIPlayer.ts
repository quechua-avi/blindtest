import type { Song, Difficulty } from '../types'

const DIFFICULTY_PARAMS: Record<Difficulty, { minDelay: number; maxDelay: number; accuracy: number }> = {
  easy: { minDelay: 12, maxDelay: 25, accuracy: 0.5 },   // répond tard, pas toujours bien
  medium: { minDelay: 5, maxDelay: 18, accuracy: 0.7 },
  hard: { minDelay: 2, maxDelay: 10, accuracy: 0.9 },
}

export class AIPlayer {
  readonly id: string
  readonly name: string
  readonly avatarColor: string
  private difficulty: Difficulty
  private timer: NodeJS.Timeout | null = null

  constructor(id: string, name: string, avatarColor: string, difficulty: Difficulty) {
    this.id = id
    this.name = name
    this.avatarColor = avatarColor
    this.difficulty = difficulty
  }

  scheduleAnswer(song: Song, timeLimit: number, onAnswer: (answer: string) => void) {
    const params = DIFFICULTY_PARAMS[this.difficulty]
    const willAnswer = Math.random() < params.accuracy

    if (!willAnswer) return

    const delay =
      params.minDelay + Math.random() * (params.maxDelay - params.minDelay)
    const clampedDelay = Math.min(delay, timeLimit - 1)

    this.timer = setTimeout(() => {
      // Parfois donne la bonne réponse, parfois une mauvaise
      const answer = Math.random() < params.accuracy ? song.title : 'mauvaise réponse aléatoire xyz'
      onAnswer(answer)
    }, clampedDelay * 1000)
  }

  cancelScheduled() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
