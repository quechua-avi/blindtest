import type { Server, Socket } from 'socket.io'
import type {
  Player,
  PlayerScore,
  GameSettings,
  RoomStatus,
  Song,
  RoomState,
  GameResults,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types'
import { CONFIG } from '../config'
import { selectSongs, generateChoices } from '../songs/songSelector'
import { SONG_LIBRARY } from '../songs/songLibrary'
import { fetchDeezerPreview } from '../songs/deezerLookup'
import { checkAnswer } from '../matching/fuzzyMatch'
import {
  calculatePoints,
  getStreakBonus,
  createInitialScore,
  applyCorrectAnswer,
  applyWrongAnswer,
} from './ScoreEngine'
import { AIPlayer } from './AIPlayer'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>

export class GameRoom {
  readonly code: string
  players: Map<string, Player> = new Map()
  scores: Map<string, PlayerScore> = new Map()
  settings: GameSettings
  status: RoomStatus = 'lobby'

  // Game state
  private playlist: Song[] = []
  private previewUrls: Map<string, string> = new Map() // song.id → Deezer preview URL
  private currentRoundIndex = -1
  private currentSong: Song | null = null
  private roundStartedAt = 0
  private correctGuessers: Array<{ playerId: string; guessTime: number }> = []
  private hasAnswered: Set<string> = new Set()
  private roundTimer: NodeJS.Timeout | null = null
  private tickTimer: NodeJS.Timeout | null = null
  private cleanupTimer: NodeJS.Timeout | null = null
  private isPaused = false
  private pausedTimeRemaining = 0
  private gameStartedAt = 0
  private songsPlayed: Array<{ song: Song; winners: string[] }> = []
  private aiPlayers: AIPlayer[] = []
  private io: IoServer

  constructor(io: IoServer, hostSocket: Socket, hostName: string, avatarColor: string) {
    this.io = io
    this.code = ''  // sera défini par GameManager
    this.settings = {
      ...CONFIG.DEFAULT_SETTINGS,
      genres: [...CONFIG.DEFAULT_SETTINGS.genres],
      decades: [...CONFIG.DEFAULT_SETTINGS.decades],
    }

    const host: Player = {
      id: hostSocket.id,
      name: hostName,
      avatarColor,
      isHost: true,
      isReady: false,
    }
    this.players.set(hostSocket.id, host)
    this.scores.set(hostSocket.id, createInitialScore(hostSocket.id, hostName, avatarColor))
  }

  // ─── Joueurs ─────────────────────────────────

  addPlayer(socket: Socket, name: string, avatarColor: string): Player | string {
    if (this.status !== 'lobby') return 'La partie a déjà commencé'
    if (this.players.size >= this.settings.maxPlayers) return 'Salle pleine'

    const player: Player = {
      id: socket.id,
      name,
      avatarColor,
      isHost: false,
      isReady: false,
    }
    this.players.set(socket.id, player)
    this.scores.set(socket.id, createInitialScore(socket.id, name, avatarColor))
    return player
  }

  removePlayer(socketId: string): { wasHost: boolean; newHostId?: string } {
    const player = this.players.get(socketId)
    if (!player) return { wasHost: false }

    this.players.delete(socketId)
    this.scores.delete(socketId)

    if (player.isHost) {
      // Transférer le rôle d'hôte au premier joueur restant
      const next = this.players.values().next().value as Player | undefined
      if (next) {
        next.isHost = true
        return { wasHost: true, newHostId: next.id }
      }
      return { wasHost: true }
    }
    return { wasHost: false }
  }

  kickPlayer(targetId: string): boolean {
    if (!this.players.has(targetId)) return false
    this.players.delete(targetId)
    this.scores.delete(targetId)
    return true
  }

  setReady(playerId: string, isReady: boolean) {
    const p = this.players.get(playerId)
    if (p) p.isReady = isReady
  }

  updateSettings(partial: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...partial }
  }

  assignTeam(playerId: string, teamId: 'A' | 'B') {
    const p = this.players.get(playerId)
    if (p) p.teamId = teamId
    const s = this.scores.get(playerId)
    if (s) s.teamId = teamId
  }

  // ─── Démarrage de la partie ───────────────────

  startGame(): string | null {
    if (this.players.size < 1) return 'Pas assez de joueurs'
    this.playlist = selectSongs(this.settings)
    if (this.playlist.length === 0) return 'Aucune chanson disponible pour ces paramètres'

    // Réinitialiser les scores
    for (const [id, player] of this.players) {
      this.scores.set(id, createInitialScore(id, player.name, player.avatarColor, false, player.teamId))
    }

    // Ajouter l'IA si mode soloVsAI
    if (this.settings.mode === 'soloVsAI') {
      this.addAIPlayers()
    }

    this.status = 'playing'
    this.currentRoundIndex = -1
    this.songsPlayed = []
    this.previewUrls = new Map()
    this.gameStartedAt = Date.now()

    // Pré-fetcher toutes les previews Deezer en parallèle, puis démarrer
    this.prefetchAllPreviews().then(() => this.startNextRound())
    return null
  }

  private async prefetchAllPreviews(): Promise<void> {
    console.log(`[Deezer] Pré-fetch de ${this.playlist.length} chansons...`)
    await Promise.all(
      this.playlist.map(async (song) => {
        const url = await fetchDeezerPreview(song.title, song.artist)
        if (url) this.previewUrls.set(song.id, url)
      })
    )
    const found = this.previewUrls.size
    console.log(`[Deezer] ${found}/${this.playlist.length} previews trouvées`)
  }

  private addAIPlayers() {
    const aiNames = ['🤖 RoboBlind', '🎵 MelodAI', '🎸 AutoGroove']
    const aiColors = ['#10b981', '#f59e0b', '#06b6d4']
    for (let i = 0; i < 2; i++) {
      const id = `ai-${i}-${this.code}`
      const name = aiNames[i]
      const color = aiColors[i]
      const aiPlayer: Player = { id, name, avatarColor: color, isHost: false, isReady: true, isAI: true }
      this.players.set(id, aiPlayer)
      this.scores.set(id, createInitialScore(id, name, color, true))
      this.aiPlayers.push(new AIPlayer(id, name, color, this.settings.difficulty))
    }
  }

  // ─── Round lifecycle ──────────────────────────

  startNextRound() {
    this.currentRoundIndex++
    if (this.currentRoundIndex >= this.playlist.length) {
      this.endGame()
      return
    }

    this.currentSong = this.playlist[this.currentRoundIndex]
    this.correctGuessers = []
    this.hasAnswered = new Set()
    this.isPaused = false
    this.roundStartedAt = Date.now()

    const choices =
      this.settings.answerMode === 'multipleChoice'
        ? generateChoices(this.currentSong, SONG_LIBRARY)
        : undefined

    this.io.to(this.code).emit('game:roundStart', {
      roundNumber: this.currentRoundIndex + 1,
      totalRounds: this.playlist.length,
      genre: this.currentSong.genre,
      decade: this.currentSong.decade,
      timeLimit: this.settings.playDuration,
      choices,
      startedAt: this.roundStartedAt,
    })

    // Émettre l'URL de preview Deezer séparément (sans titre/artiste = anti-triche)
    const previewUrl = this.previewUrls.get(this.currentSong.id)
    if (previewUrl) {
      this.io.to(this.code).emit('game:playSong', { previewUrl })
    } else {
      console.warn(`[Deezer] Pas de preview pour "${this.currentSong.title}" — round sans audio`)
    }

    // Démarrer le tick
    let timeRemaining = this.settings.playDuration
    this.tickTimer = setInterval(() => {
      if (this.isPaused) return
      timeRemaining--
      this.io.to(this.code).emit('game:tick', { timeRemaining })
      if (timeRemaining <= 0) this.endRound()
    }, 1000)

    // IA : planifier les réponses
    for (const ai of this.aiPlayers) {
      ai.scheduleAnswer(this.currentSong, this.settings.playDuration, (answer) => {
        if (this.status === 'playing' && this.currentSong) {
          this.handleAnswer(ai.id, answer, Date.now())
        }
      })
    }

    // Sécurité : fin forcée après playDuration + 1s
    this.roundTimer = setTimeout(() => this.endRound(), (this.settings.playDuration + 1) * 1000)
  }

  endRound() {
    if (!this.currentSong) return
    this.clearTimers()

    const song = this.currentSong
    const winners = this.correctGuessers.map((g) => g.playerId)
    this.songsPlayed.push({ song, winners })

    const leaderboard = this.getLeaderboard()

    this.io.to(this.code).emit('game:roundEnd', {
      song,
      leaderboard,
      correctGuessers: winners,
    })

    // Pause entre rounds
    setTimeout(() => {
      if (this.status === 'playing') this.startNextRound()
    }, CONFIG.BETWEEN_ROUNDS_DELAY_MS)
  }

  skipRound() {
    this.clearTimers()
    this.endRound()
  }

  pauseGame(paused: boolean) {
    this.isPaused = paused
    this.io.to(this.code).emit('game:paused', { paused })
  }

  endGame() {
    this.status = 'ended'
    this.clearTimers()

    const leaderboard = this.getLeaderboard()
    const gameDuration = Date.now() - this.gameStartedAt

    const finalResults: GameResults = {
      leaderboard,
      mvp: this.computeMVP(leaderboard),
      songsPlayed: this.songsPlayed,
      gameDuration,
    }

    this.io.to(this.code).emit('game:ended', { finalResults })

    // Nettoyage différé
    this.cleanupTimer = setTimeout(() => {
      // GameManager supprimera la room
    }, CONFIG.ROOM_CLEANUP_DELAY_MS)
  }

  // ─── Réponse joueur ────────────────────────────

  handleAnswer(
    playerId: string,
    answer: string,
    timestamp: number
  ): { correct: boolean; points?: number } {
    if (!this.currentSong || this.status !== 'playing') return { correct: false }
    if (this.hasAnswered.has(playerId)) return { correct: false }

    const result = checkAnswer(answer, this.currentSong)
    this.hasAnswered.add(playerId)

    if (!result.correct) {
      const player = this.players.get(playerId)
      if (player && !player.isAI) {
        this.io.to(playerId).emit('game:wrongAnswer', { playerId })
      }
      const score = this.scores.get(playerId)
      if (score) this.scores.set(playerId, applyWrongAnswer(score))
      return { correct: false }
    }

    // Bonne réponse
    const guessTime = (timestamp - this.roundStartedAt) / 1000
    const timeRemaining = Math.max(0, this.settings.playDuration - guessTime)
    const correctOrder = this.correctGuessers.length
    this.correctGuessers.push({ playerId, guessTime })

    const points = calculatePoints(
      this.settings.difficulty,
      timeRemaining,
      this.settings.playDuration,
      correctOrder
    )

    const score = this.scores.get(playerId)
    if (score) {
      const streakBonus = getStreakBonus(score.streak + 1)
      const updated = applyCorrectAnswer(score, points, streakBonus, guessTime)
      this.scores.set(playerId, updated)

      const player = this.players.get(playerId)
      if (player) {
        this.io.to(this.code).emit('game:correctAnswer', {
          playerId,
          playerName: player.name,
          points: points + streakBonus,
          totalScore: updated.score,
          guessTime,
          matchType: result.matched ?? 'exact',
        })
      }
    }

    // Si tous ont répondu → fin anticipée du round
    const humanCount = [...this.players.values()].filter((p) => !p.isAI).length
    if (this.correctGuessers.length >= humanCount + this.aiPlayers.length) {
      setTimeout(() => this.endRound(), 1500)
    }

    return { correct: true, points }
  }

  // ─── Helpers ──────────────────────────────────

  getLeaderboard(): PlayerScore[] {
    return [...this.scores.values()].sort((a, b) => b.score - a.score)
  }

  getPublicState(): RoomState {
    return {
      code: this.code,
      status: this.status,
      players: [...this.players.values()],
      settings: this.settings,
      currentRound: this.currentRoundIndex + 1,
      totalRounds: this.playlist.length || this.settings.rounds,
    }
  }

  private computeMVP(leaderboard: PlayerScore[]) {
    if (leaderboard.length === 0) return { fastestGuesser: null, mostCorrect: null, longestStreak: null }
    const fastestGuesser = [...this.scores.values()]
      .filter((s) => s.correctAnswers > 0)
      .sort((a, b) => a.averageGuessTime - b.averageGuessTime)[0] ?? null
    const mostCorrect = [...this.scores.values()].sort((a, b) => b.correctAnswers - a.correctAnswers)[0] ?? null
    const longestStreak = [...this.scores.values()].sort((a, b) => b.bestStreak - a.bestStreak)[0] ?? null
    return { fastestGuesser, mostCorrect, longestStreak }
  }

  private clearTimers() {
    if (this.roundTimer) { clearTimeout(this.roundTimer); this.roundTimer = null }
    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null }
    for (const ai of this.aiPlayers) ai.cancelScheduled()
  }

  destroy() {
    this.clearTimers()
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer)
  }

  get isEmpty(): boolean {
    return [...this.players.values()].filter((p) => !p.isAI).length === 0
  }
}
