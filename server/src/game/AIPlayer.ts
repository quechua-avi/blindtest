import type { Song } from '../types'

const AI_PARAMS = { minDelay: 5, maxDelay: 18, accuracy: 0.7 }

export class AIPlayer {
  readonly id: string
  readonly name: string
  readonly avatarColor: string
  private timer: NodeJS.Timeout | null = null

  constructor(id: string, name: string, avatarColor: string) {
    this.id = id
    this.name = name
    this.avatarColor = avatarColor
  }

  scheduleAnswer(song: Song, timeLimit: number, onAnswer: (answer: string) => void) {
    const params = AI_PARAMS
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
