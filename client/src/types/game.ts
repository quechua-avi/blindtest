export type Genre = 'complet' | 'jul' | 'chartsweekly'
export type Decade = '2000s' | '2010s' | '2020s'
export type GameMode = 'classic' | 'teams' | 'buzzer' | 'saboteur' | 'streamclash'
export type AnswerMode = 'text' | 'multipleChoice'
export type RoomStatus = 'lobby' | 'playing' | 'paused' | 'ended'
export type AnswerMatchType = 'exact' | 'fuzzy' | 'partial'

export interface GameSettings {
  mode: GameMode
  genres: Genre[]
  rounds: number
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
  previewUrl?: string
  coverUrl?: string
}

export interface Player {
  id: string
  name: string
  avatarColor: string
  isHost: boolean
  isReady: boolean
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

export interface SaboteurReveal {
  saboteurId: string
  saboteurName: string
  saboteurAvatarColor: string
  caught: boolean
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
  saboteurReveal?: SaboteurReveal
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

export interface StreamClashSongPublic {
  id: string
  title: string
  artist: string
  year: number
  coverUrl?: string
}

export interface StreamClashRevealData {
  songA: StreamClashSongPublic & { streams: number }
  songB: StreamClashSongPublic & { streams: number }
  winner: 'A' | 'B'
  votesA: number
  votesB: number
  leaderboard: PlayerScore[]
}

export const GENRE_LABELS: Record<Genre, string> = {
  complet: '🎵 Complet',
  jul: 'Jul',
  chartsweekly: '🏆 Top France',
}

export const GENRE_COLORS: Record<Genre, string> = {
  complet: '#7c3aed',
  jul: '#0ea5e9',
  chartsweekly: '#10b981',
}

export const DECADE_LABELS: Record<Decade, string> = {
  '2000s': 'Années 2000',
  '2010s': 'Années 2010',
  '2020s': 'Années 2020',
}

export const ALLOWED_REACTIONS = ['❤️', '🔥', '😮', '😂', '👏', '🎵', '🎸', '🤯', '💯', '👀']
