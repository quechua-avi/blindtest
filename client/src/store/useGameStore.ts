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
  correctGuesserIds: string[]
  revealedSong: RevealedSong | null

  // Scores
  leaderboard: PlayerScore[]
  scoreFeed: ScoreFeedItem[]

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
  onWrongAnswer: () => void
  onRoundEnd: (data: { song: Song; leaderboard: PlayerScore[]; correctGuessers: string[] }) => void
  onGameEnded: (results: GameResults) => void
  onChatMessage: (msg: ChatMessage) => void
  onReaction: (reaction: ReactionEvent) => void
  reset: () => void
}

const DEFAULT_SETTINGS: GameSettings = {
  mode: 'classic',
  genres: ['pop', 'hiphop', 'electronic', 'rnb', 'french', 'latin'],
  decades: ['2000s', '2010s', '2020s'],
  rounds: 10,
  difficulty: 'medium',
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
  correctGuesserIds: [],
  revealedSong: null,
  leaderboard: [],
  scoreFeed: [],
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
      correctGuesserIds: [],
      revealedSong: null,
      scoreFeed: [],
      pendingSong: null, // Réinitialiser avant l'arrivée de la nouvelle preview
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

  onWrongAnswer: () => set({ myAnswerResult: 'wrong' }),

  onRoundEnd: ({ song, leaderboard, correctGuessers }) => {
    set({
      status: 'roundEnd',
      leaderboard,
      revealedSong: { song, correctGuessers },
      pendingSong: null,
    })
  },

  onGameEnded: (finalResults) => {
    set({ status: 'results', finalResults, leaderboard: finalResults.leaderboard })
  },

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
      correctGuesserIds: [],
      revealedSong: null,
      leaderboard: [],
      scoreFeed: [],
      finalResults: null,
      pendingSong: null,
      messages: [],
      reactions: [],
    })
  },
}))
