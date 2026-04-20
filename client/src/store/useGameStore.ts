import { create } from 'zustand'
import type {
  Player,
  PlayerScore,
  GameSettings,
  RoundState,
  RoomState,
  GameResults,
  ChatMessage,
  ReactionEvent,
  ScoreFeedItem,
  Song,
  AnswerMatchType,
} from '../types/game'

type AppStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'roundEnd' | 'results' | 'error'

interface RevealedSong {
  song: Song
  correctGuessers: string[]
  coverUrl?: string
}

interface GameStore {
  // Status
  status: AppStatus
  error: string | null

  // Room
  roomCode: string | null
  players: Player[]
  myPlayerId: string | null
  isHost: boolean
  settings: GameSettings

  // Round
  currentRound: RoundState | null
  timeRemaining: number
  myAnswerResult: 'pending' | 'correct' | 'wrong' | null
  attemptsLeft: number
  correctGuesserIds: string[]
  revealedSong: RevealedSong | null
  activeBuzz: { playerId: string; playerName: string; avatarColor: string } | null
  isBuzzedOut: boolean

  // Scores
  leaderboard: PlayerScore[]
  scoreFeed: ScoreFeedItem[]
  teamScores: { A: number; B: number } | null

  // Results
  finalResults: GameResults | null

  // Lecture audio en attente (stockée ici pour éviter la race condition)
  pendingSong: { previewUrl: string } | null

  // Chat
  messages: ChatMessage[]
  reactions: ReactionEvent[]

  // Actions
  setStatus: (s: AppStatus) => void
  onPlaySong: (previewUrl: string) => void
  setError: (e: string | null) => void
  onRoomJoined: (room: RoomState, myId: string) => void
  onRoomCreated: (room: RoomState, myId: string) => void
  onPlayerJoined: (player: Player) => void
  onPlayerLeft: (playerId: string, newHostId?: string) => void
  onPlayerKicked: (playerId: string, myId: string) => void
  onPlayerReady: (playerId: string, isReady: boolean) => void
  onSettingsUpdated: (settings: GameSettings) => void
  onTeamAssigned: (playerId: string, teamId: 'A' | 'B') => void
  onRoundStart: (round: RoundState) => void
  onTick: (timeRemaining: number) => void
  onCorrectAnswer: (data: {
    playerId: string
    playerName: string
    avatarColor: string
    points: number
    totalScore: number
    guessTime: number
    matchType: AnswerMatchType
  }) => void
  onWrongAnswer: (attemptsLeft: number) => void
  onRoundEnd: (data: { song: Song; leaderboard: PlayerScore[]; correctGuessers: string[]; teamScores?: { A: number; B: number }; coverUrl?: string }) => void
  onGameEnded: (results: GameResults) => void
  onBuzzed: (data: { playerId: string; playerName: string; avatarColor: string }) => void
  onBuzzWrong: (playerId: string, myPlayerId: string | null) => void
  onBuzzTimeout: (playerId: string, myPlayerId: string | null) => void
  onChatMessage: (msg: ChatMessage) => void
  onReaction: (reaction: ReactionEvent) => void
  reset: () => void
}

const DEFAULT_SETTINGS: GameSettings = {
  mode: 'classic',
  genres: ['pop', 'hiphop', 'electronic', 'rnb', 'french', 'latin'],
  decades: ['2000s', '2010s', '2020s'],
  rounds: 10,
  answerMode: 'text',
  playDuration: 20,
  maxPlayers: 8,
}

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'idle',
  error: null,
  roomCode: null,
  players: [],
  myPlayerId: null,
  isHost: false,
  settings: DEFAULT_SETTINGS,
  currentRound: null,
  timeRemaining: 0,
  myAnswerResult: null,
  attemptsLeft: 3,
  correctGuesserIds: [],
  revealedSong: null,
  activeBuzz: null,
  isBuzzedOut: false,
  leaderboard: [],
  scoreFeed: [],
  teamScores: null,
  finalResults: null,
  pendingSong: null,
  messages: [],
  reactions: [],

  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  onPlaySong: (previewUrl) => set({ pendingSong: { previewUrl } }),

  onRoomJoined: (room, myId) => {
    const me = room.players.find((p) => p.id === myId)
    set({
      status: 'lobby',
      roomCode: room.code,
      players: room.players,
      myPlayerId: myId,
      isHost: me?.isHost ?? false,
      settings: room.settings,
    })
  },

  onRoomCreated: (room, myId) => {
    set({
      status: 'lobby',
      roomCode: room.code,
      players: room.players,
      myPlayerId: myId,
      isHost: true,
      settings: room.settings,
    })
  },

  onPlayerJoined: (player) => {
    set((s) => ({ players: [...s.players, player] }))
  },

  onPlayerLeft: (playerId, newHostId) => {
    set((s) => ({
      players: s.players
        .filter((p) => p.id !== playerId)
        .map((p) => ({ ...p, isHost: p.id === newHostId ? true : p.isHost })),
      isHost: newHostId === s.myPlayerId ? true : s.isHost,
    }))
  },

  onPlayerKicked: (playerId, myId) => {
    if (playerId === myId) {
      get().reset()
      return
    }
    set((s) => ({ players: s.players.filter((p) => p.id !== playerId) }))
  },

  onPlayerReady: (playerId, isReady) => {
    set((s) => ({
      players: s.players.map((p) => (p.id === playerId ? { ...p, isReady } : p)),
    }))
  },

  onSettingsUpdated: (settings) => set({ settings }),

  onTeamAssigned: (playerId, teamId) => {
    set((s) => ({
      players: s.players.map((p) => (p.id === playerId ? { ...p, teamId } : p)),
    }))
  },

  onRoundStart: (round) => {
    set({
      status: 'playing',
      currentRound: round,
      timeRemaining: round.timeLimit,
      myAnswerResult: 'pending',
      attemptsLeft: 3,
      correctGuesserIds: [],
      revealedSong: null,
      activeBuzz: null,
      isBuzzedOut: false,
      scoreFeed: [],
      pendingSong: null,
    })
  },

  onTick: (timeRemaining) => set({ timeRemaining }),

  onCorrectAnswer: ({ playerId, playerName, avatarColor, points, totalScore, matchType }) => {
    set((s) => {
      const feedItem: ScoreFeedItem = {
        id: `${playerId}-${Date.now()}`,
        playerId,
        playerName,
        avatarColor,
        points,
        matchType,
        timestamp: Date.now(),
      }
      const newFeed = [feedItem, ...s.scoreFeed].slice(0, 6)
      const newLeaderboard = s.leaderboard.map((p) =>
        p.playerId === playerId ? { ...p, score: totalScore } : p
      )
      return {
        correctGuesserIds: [...s.correctGuesserIds, playerId],
        scoreFeed: newFeed,
        leaderboard: newLeaderboard,
        myAnswerResult:
          playerId === s.myPlayerId ? 'correct' : s.myAnswerResult,
      }
    })
  },

  onWrongAnswer: (attemptsLeft) => set({
    attemptsLeft,
    myAnswerResult: attemptsLeft === 0 ? 'wrong' : 'pending',
  }),

  onRoundEnd: ({ song, leaderboard, correctGuessers, teamScores, coverUrl }) => {
    set({
      status: 'roundEnd',
      leaderboard,
      teamScores: teamScores ?? null,
      revealedSong: { song, correctGuessers, coverUrl },
      pendingSong: null,
    })
  },

  onGameEnded: (finalResults) => {
    set({
      status: 'results',
      finalResults,
      leaderboard: finalResults.leaderboard,
      teamScores: finalResults.teamScores ?? null,
    })
  },

  onBuzzed: (data) => set({ activeBuzz: data }),

  onBuzzWrong: (playerId, myPlayerId) => set((s) => ({
    activeBuzz: null,
    isBuzzedOut: playerId === myPlayerId ? true : s.isBuzzedOut,
    myAnswerResult: playerId === myPlayerId ? 'wrong' : s.myAnswerResult,
  })),

  onBuzzTimeout: (playerId, myPlayerId) => set((s) => ({
    activeBuzz: null,
    isBuzzedOut: playerId === myPlayerId ? true : s.isBuzzedOut,
    myAnswerResult: playerId === myPlayerId ? 'wrong' : s.myAnswerResult,
  })),

  onChatMessage: (msg) => {
    set((s) => ({ messages: [...s.messages.slice(-49), msg] }))
  },

  onReaction: (reaction) => {
    set((s) => ({ reactions: [...s.reactions.slice(-19), reaction] }))
    // Auto-cleanup après 3s
    setTimeout(() => {
      set((s) => ({ reactions: s.reactions.filter((r) => r !== reaction) }))
    }, 3000)
  },

  reset: () => {
    set({
      status: 'idle',
      error: null,
      roomCode: null,
      players: [],
      myPlayerId: null,
      isHost: false,
      settings: DEFAULT_SETTINGS,
      currentRound: null,
      timeRemaining: 0,
      myAnswerResult: null,
      attemptsLeft: 3,
      correctGuesserIds: [],
      revealedSong: null,
      activeBuzz: null,
      isBuzzedOut: false,
      leaderboard: [],
      scoreFeed: [],
      teamScores: null,
      finalResults: null,
      pendingSong: null,
      messages: [],
      reactions: [],
    })
  },
}))
