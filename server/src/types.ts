export type Genre = 'pop' | 'hiphop' | 'electronic' | 'rnb' | 'french' | 'latin'
export type Decade = '2000s' | '2010s' | '2020s'
export type GameMode = 'classic' | 'teams' | 'soloVsAI' | 'buzzer'
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
  id: string          // identifiant interne (ex-YouTube ID, conservé pour le fuzzy match)
  title: string
  artist: string
  year: number
  genre: Genre
  decade: Decade
  alternativeTitles?: string[]
  alternativeArtists?: string[]
}

export interface Player {
  id: string          // socket.id
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
  totalGuessTime: number
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
  choices?: string[]    // seulement si answerMode === 'multipleChoice'
  startedAt: number     // Date.now() côté serveur
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

export interface AnswerCheckResult {
  correct: boolean
  matched?: AnswerMatchType
  matchedField?: 'title' | 'artist'
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

// Événements Socket.io — Client → Serveur
export interface ClientToServerEvents {
  'lobby:create': (data: { playerName: string; settings?: Partial<GameSettings> }) => void
  'lobby:join': (data: { roomCode: string; playerName: string }) => void
  'lobby:leave': () => void
  'lobby:kick': (data: { targetPlayerId: string }) => void
  'lobby:ready': (data: { isReady: boolean }) => void
  'lobby:updateSettings': (data: { settings: Partial<GameSettings> }) => void
  'lobby:assignTeam': (data: { playerId: string; teamId: 'A' | 'B' }) => void
  'game:start': () => void
  'game:submitAnswer': (data: { answer: string; timestamp: number }) => void
  'game:buzz': () => void
  'game:skipSong': () => void
  'game:pause': (data: { paused: boolean }) => void
  'game:end': () => void
  'chat:message': (data: { text: string }) => void
  'chat:reaction': (data: { emoji: string }) => void
}

// Événements Socket.io — Serveur → Client
export interface ServerToClientEvents {
  'lobby:created': (data: { room: RoomState }) => void
  'lobby:joined': (data: { room: RoomState; you: Player }) => void
  'lobby:playerJoined': (data: { player: Player }) => void
  'lobby:playerLeft': (data: { playerId: string; newHostId?: string }) => void
  'lobby:playerKicked': (data: { playerId: string }) => void
  'lobby:playerReady': (data: { playerId: string; isReady: boolean }) => void
  'lobby:settingsUpdated': (data: { settings: GameSettings }) => void
  'lobby:teamAssigned': (data: { playerId: string; teamId: 'A' | 'B' }) => void
  'lobby:error': (data: { code: string; message: string }) => void
  'game:roundStart': (data: RoundState) => void
  'game:playSong': (data: { previewUrl: string }) => void
  'game:tick': (data: { timeRemaining: number }) => void
  'game:correctAnswer': (data: {
    playerId: string
    playerName: string
    points: number
    totalScore: number
    guessTime: number
    matchType: AnswerMatchType
  }) => void
  'game:wrongAnswer': (data: { playerId: string; attemptsLeft: number }) => void
  'game:roundEnd': (data: RoundReveal) => void
  'game:paused': (data: { paused: boolean }) => void
  'game:buzzed': (data: { playerId: string; playerName: string; avatarColor: string }) => void
  'game:buzzWrong': (data: { playerId: string }) => void
  'game:buzzTimeout': (data: { playerId: string }) => void
  'game:ended': (data: { finalResults: GameResults }) => void
  'chat:message': (data: ChatMessage) => void
  'chat:reaction': (data: ReactionEvent) => void
}
