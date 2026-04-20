export type Genre = 'pop' | 'hiphop' | 'electronic' | 'rnb' | 'french' | 'latin'
export type Decade = '2000s' | '2010s' | '2020s'
export type GameMode = 'classic' | 'speedRound' | 'teams' | 'soloVsAI'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type AnswerMode = 'text' | 'multipleChoice'
export type RoomStatus = 'lobby' | 'playing' | 'paused' | 'ended'
export type AnswerMatchType = 'exact' | 'fuzzy' | 'partial'

export interface GameSettings {
  mode: GameMode
  genres: Genre[]
  decades: Decade[]
  rounds: number
  difficulty: Difficulty
  answerMode: AnswerMode
  playDuration: number
  maxPlayers: number
}

export interface Song {
  id: string
  title: string
  artist: string
  year: number
  genre: Genre
  decade: Decade
}

export interface Player {
  id: string
  name: string
  avatarColor: string
  isHost: boolean
  isReady: boolean
  isAI?: boolean
  teamId?: 'A' | 'B'
}

export interface PlayerScore {
  playerId: string
  playerName: string
  avatarColor: string
  score: number
  correctAnswers: number
  totalAnswers: number
  averageGuessTime: number
  streak: number
  bestStreak: number
  isAI?: boolean
  teamId?: 'A' | 'B'
}

export interface RoundState {
  roundNumber: number
  totalRounds: number
  genre: Genre
  decade: Decade
  timeLimit: number
  choices?: string[]
  startedAt: number
}

export interface RoundReveal {
  song: Song
  leaderboard: PlayerScore[]
  correctGuessers: string[]
  teamScores?: { A: number; B: number }
  coverUrl?: string
}

export interface GameResults {
  leaderboard: PlayerScore[]
  mvp: {
    fastestGuesser: PlayerScore | null
    mostCorrect: PlayerScore | null
    longestStreak: PlayerScore | null
  }
  songsPlayed: Array<{ song: Song; winners: string[] }>
  gameDuration: number
  teamScores?: { A: number; B: number }
  teamWinner?: 'A' | 'B' | 'tie'
}

export interface RoomState {
  code: string
  status: RoomStatus
  players: Player[]
  settings: GameSettings
  currentRound: number
  totalRounds: number
}

export interface ChatMessage {
  playerId: string
  playerName: string
  text: string
  timestamp: number
}

export interface ReactionEvent {
  playerId: string
  playerName: string
  emoji: string
  timestamp: number
}

export interface ScoreFeedItem {
  id: string
  playerId: string
  playerName: string
  avatarColor: string
  points: number
  matchType: AnswerMatchType
  timestamp: number
}

export const GENRE_LABELS: Record<Genre, string> = {
  pop: 'Pop',
  hiphop: 'Hip-Hop',
  electronic: 'Electronic',
  rnb: 'R&B',
  french: 'Musique Française',
  latin: 'Latin',
}

export const GENRE_COLORS: Record<Genre, string> = {
  pop: '#ec4899',
  hiphop: '#f59e0b',
  electronic: '#8b5cf6',
  rnb: '#6366f1',
  french: '#3b82f6',
  latin: '#f97316',
}

export const DECADE_LABELS: Record<Decade, string> = {
  '2000s': 'Années 2000',
  '2010s': 'Années 2010',
  '2020s': 'Années 2020',
}

export const ALLOWED_REACTIONS = ['❤️', '🔥', '😮', '😂', '👏', '🎵', '🎸', '🤯', '💯', '👀']
