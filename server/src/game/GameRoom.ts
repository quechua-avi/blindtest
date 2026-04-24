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
import { STREAMCLASH_SONGS } from '../songs/streamclashSongs'
import type { StreamClashSong } from '../songs/streamclashSongs'
import { fetchDeezerPreview } from '../songs/deezerLookup'
import { getCachedPreview, upsertPreview } from '../songs/previewEnrichment'
import { checkAnswer } from '../matching/fuzzyMatch'

const SINGLE_ARTIST_GENRES = new Set(['jul'])
import {
  calculatePoints,
  getStreakBonus,
  createInitialScore,
  applyCorrectAnswer,
  applyWrongAnswer,
} from './ScoreEngine'
import { updateUserStats } from '../auth/userService'

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
  private coverUrls: Map<string, string> = new Map()   // song.id → Deezer cover URL
  private currentRoundIndex = -1
  private currentSong: Song | null = null
  private roundStartedAt = 0
  private correctGuessers: Array<{ playerId: string; guessTime: number }> = []
  private hasAnswered: Set<string> = new Set()
  private wrongAttempts: Map<string, number> = new Map()
  private readonly MAX_ATTEMPTS = 3
  private roundTimer: NodeJS.Timeout | null = null
  private tickTimer: NodeJS.Timeout | null = null
  private cleanupTimer: NodeJS.Timeout | null = null
  private buzzerTimer: NodeJS.Timeout | null = null
  private buzzedPlayerId: string | null = null
  private buzzedOutPlayers: Set<string> = new Set()
  private isPaused = false
  private pausedTimeRemaining = 0
  private gameStartedAt = 0
  private songsPlayed: Array<{ song: Song; winners: string[] }> = []
  private io: IoServer
  // Saboteur mode
  private saboteurId: string | null = null
  private currentVotes: Map<string, string> = new Map() // voterId → targetId
  // StreamClash mode
  private scPairs: [StreamClashSong, StreamClashSong][] = []
  private scVotes: Map<string, 'A' | 'B'> = new Map()
  private scRoundIndex = -1
  private scCoverUrls: Map<string, string> = new Map()
  private scRevealed = false

  constructor(io: IoServer, hostSocket: Socket, hostName: string, avatarColor: string, userId?: number) {
    this.io = io
    this.code = ''  // sera défini par GameManager
    this.settings = {
      ...CONFIG.DEFAULT_SETTINGS,
      genres: [...CONFIG.DEFAULT_SETTINGS.genres],
    }

    const host: Player = {
      id: hostSocket.id,
      name: hostName,
      avatarColor,
      isHost: true,
      isReady: false,
      userId,
    }
    this.players.set(hostSocket.id, host)
    const hostScore = createInitialScore(hostSocket.id, hostName, avatarColor)
    hostScore.userId = userId
    this.scores.set(hostSocket.id, hostScore)
  }

  // ─── Joueurs ─────────────────────────────────

  addPlayer(socket: Socket, name: string, avatarColor: string, userId?: number): Player | string {
    if (this.status !== 'lobby') return 'La partie a déjà commencé'
    if (this.players.size >= this.settings.maxPlayers) return 'Salle pleine'

    const player: Player = {
      id: socket.id,
      name,
      avatarColor,
      isHost: false,
      isReady: false,
      userId,
    }
    this.players.set(socket.id, player)
    const score = createInitialScore(socket.id, name, avatarColor)
    score.userId = userId
    this.scores.set(socket.id, score)
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

    if (this.settings.mode === 'saboteur' && this.players.size < 4)
      return 'Le mode Saboteur nécessite au moins 4 joueurs'

    if (this.settings.mode === 'streamclash') return this.startStreamClash()

    this.playlist = selectSongs(this.settings)
    if (this.playlist.length === 0) return 'Aucune chanson disponible pour ces paramètres'

    // Réinitialiser les scores
    for (const [id, player] of this.players) {
      this.scores.set(id, createInitialScore(id, player.name, player.avatarColor, player.teamId))
    }

    // Désigner le saboteur aléatoirement
    if (this.settings.mode === 'saboteur') {
      const humanIds = [...this.players.keys()]
      this.saboteurId = humanIds[Math.floor(Math.random() * humanIds.length)]
      this.currentVotes = new Map()
    }

    this.status = 'playing'
    this.currentRoundIndex = -1
    this.songsPlayed = []
    this.previewUrls = new Map()
    this.coverUrls = new Map()
    this.gameStartedAt = Date.now()

    // Pré-fetcher toutes les previews Deezer en parallèle, puis démarrer
    this.prefetchAllPreviews().then(() => this.startNextRound())
    return null
  }

  private async prefetchAllPreviews(): Promise<void> {
    await Promise.all(
      this.playlist.map(async (song) => {
        // 1. Chansons dynamiques (Deezer charts) : URL déjà présente
        if (song.previewUrl) {
          this.previewUrls.set(song.id, song.previewUrl)
          if (song.coverUrl) this.coverUrls.set(song.id, song.coverUrl)
          return
        }
        // 2. Cache DB (bibliothèque statique enrichie au démarrage)
        const cached = getCachedPreview(song.id)
        if (cached) {
          this.previewUrls.set(song.id, cached.previewUrl)
          if (cached.coverUrl) this.coverUrls.set(song.id, cached.coverUrl)
          return
        }
        // 3. Fallback : fetch Deezer en live + mise en cache
        const result = await fetchDeezerPreview(song.title, song.artist)
        if (result) {
          this.previewUrls.set(song.id, result.previewUrl)
          if (result.coverUrl) this.coverUrls.set(song.id, result.coverUrl)
          upsertPreview(song.id, result.previewUrl, result.coverUrl)
        } else {
          upsertPreview(song.id, '', undefined) // marquer comme introuvable
        }
      })
    )
    const found = this.previewUrls.size
    console.log(`[Deezer] ${found}/${this.playlist.length} previews prêtes`)
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
    this.wrongAttempts = new Map()
    this.isPaused = false
    this.buzzedPlayerId = null
    this.buzzedOutPlayers = new Set()
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

    // Saboteur : envoyer la réponse secrètement
    if (this.settings.mode === 'saboteur' && this.saboteurId && this.currentSong) {
      this.io.to(this.saboteurId).emit('game:youAreSaboteur', {
        answer: `${this.currentSong.title} — ${this.currentSong.artist}`,
      })
    }

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
      teamScores: this.getTeamScores(),
      coverUrl: this.coverUrls.get(song.id),
    })

    // Pause entre rounds
    setTimeout(() => {
      if (this.status === 'playing') this.startNextRound()
    }, CONFIG.BETWEEN_ROUNDS_DELAY_MS)
  }

  skipRound() {
    if (this.settings.mode === 'streamclash') {
      if (!this.scRevealed) this.revealScRound()
      return
    }
    this.clearTimers()
    this.endRound()
  }

  handleSaboteurVote(voterId: string, targetId: string) {
    if (this.settings.mode !== 'saboteur') return
    if (!this.players.has(targetId) || voterId === targetId) return

    this.currentVotes.set(voterId, targetId)

    if (!this.saboteurId) return
    const votersAgainstSaboteur = [...this.currentVotes.entries()]
      .filter(([, t]) => t === this.saboteurId)
      .map(([vid]) => {
        const p = this.players.get(vid)
        return p ? { voterName: p.name, voterAvatarColor: p.avatarColor } : null
      })
      .filter((v): v is { voterName: string; voterAvatarColor: string } => v !== null)

    this.io.to(this.saboteurId).emit('game:saboteurVoteUpdate', { votes: votersAgainstSaboteur })
  }

  pauseGame(paused: boolean) {
    this.isPaused = paused
    this.io.to(this.code).emit('game:paused', { paused })
  }

  endGame() {
    this.status = 'ended'
    this.clearTimers()

    // Saboteur : calcul des votes et application des bonus/malus
    let saboteurReveal: import('../types').SaboteurReveal | undefined
    if (this.settings.mode === 'saboteur' && this.saboteurId) {
      const voteCounts = new Map<string, number>()
      for (const targetId of this.currentVotes.values()) {
        voteCounts.set(targetId, (voteCounts.get(targetId) ?? 0) + 1)
      }

      let accusedId: string | null = null
      let maxVotes = 0
      for (const [pid, count] of voteCounts) {
        if (count > maxVotes) { maxVotes = count; accusedId = pid }
      }

      const caught = accusedId === this.saboteurId
      const saboteur = this.players.get(this.saboteurId)

      if (saboteur) {
        const saboteurScore = this.scores.get(this.saboteurId)
        if (saboteurScore) {
          saboteurScore.score = Math.max(0, saboteurScore.score + (caught ? -1000 : 2000))
          this.scores.set(this.saboteurId, saboteurScore)
        }

        if (caught) {
          for (const [voterId, targetId] of this.currentVotes) {
            if (targetId === this.saboteurId) {
              const s = this.scores.get(voterId)
              if (s) { s.score += 500; this.scores.set(voterId, s) }
            }
          }
        }

        saboteurReveal = {
          saboteurId: this.saboteurId,
          saboteurName: saboteur.name,
          saboteurAvatarColor: saboteur.avatarColor,
          caught,
        }
      }
    }

    const leaderboard = this.getLeaderboard()
    const gameDuration = Date.now() - this.gameStartedAt
    const teamScores = this.getTeamScores()
    const teamWinner = teamScores
      ? teamScores.A > teamScores.B ? 'A' : teamScores.B > teamScores.A ? 'B' : 'tie'
      : undefined

    const finalResults: GameResults = {
      leaderboard,
      mvp: this.computeMVP(leaderboard),
      songsPlayed: this.songsPlayed,
      gameDuration,
      teamScores,
      teamWinner,
      saboteurReveal,
    }

    this.io.to(this.code).emit('game:ended', { finalResults })

    // Mise à jour des stats utilisateurs connectés
    const winnerId = leaderboard[0]?.playerId
    const statsUpdates = leaderboard
      .filter((s) => s.userId != null)
      .map((s) => ({
        userId: s.userId!,
        score: s.score,
        correctAnswers: s.correctAnswers,
        bestStreak: s.bestStreak,
        isWinner: s.playerId === winnerId,
      }))
    if (statsUpdates.length > 0) {
      try { updateUserStats(statsUpdates) } catch (e) { console.error('[Stats] Erreur mise à jour:', e) }
    }

    // Nettoyage différé
    this.cleanupTimer = setTimeout(() => {
      // GameManager supprimera la room
    }, CONFIG.ROOM_CLEANUP_DELAY_MS)
  }

  // ─── Réponse joueur ────────────────────────────

  handleBuzz(playerId: string) {
    if (!this.currentSong || this.status !== 'playing') return
    if (this.settings.mode !== 'buzzer') return
    if (this.buzzedPlayerId !== null) return
    if (this.buzzedOutPlayers.has(playerId) || this.hasAnswered.has(playerId)) return

    const player = this.players.get(playerId)
    if (!player) return

    this.buzzedPlayerId = playerId
    this.isPaused = true

    this.io.to(this.code).emit('game:buzzed', {
      playerId,
      playerName: player.name,
      avatarColor: player.avatarColor,
    })

    this.buzzerTimer = setTimeout(() => {
      if (this.buzzedPlayerId !== playerId) return
      this.buzzedPlayerId = null
      this.buzzedOutPlayers.add(playerId)
      this.isPaused = false
      this.buzzerTimer = null
      this.io.to(this.code).emit('game:buzzTimeout', { playerId })
      const previewUrl = this.previewUrls.get(this.currentSong!.id)
      if (previewUrl) this.io.to(this.code).emit('game:playSong', { previewUrl })
    }, 15000)
  }

  handleAnswer(
    playerId: string,
    answer: string,
    timestamp: number
  ): { correct: boolean; points?: number } {
    if (!this.currentSong || this.status !== 'playing') return { correct: false }
    if (this.hasAnswered.has(playerId)) return { correct: false }

    // En mode buzzer, seul le joueur qui a buzzé peut répondre
    if (this.settings.mode === 'buzzer' && this.buzzedPlayerId !== playerId) return { correct: false }

    const titleOnly = SINGLE_ARTIST_GENRES.has(this.currentSong.genre)
    const result = checkAnswer(answer, this.currentSong, { titleOnly })

    if (!result.correct) {
      if (this.settings.mode === 'buzzer') {
        if (this.buzzerTimer) { clearTimeout(this.buzzerTimer); this.buzzerTimer = null }
        this.buzzedPlayerId = null
        this.buzzedOutPlayers.add(playerId)
        this.hasAnswered.add(playerId)
        this.isPaused = false
        this.io.to(this.code).emit('game:buzzWrong', { playerId })
        const score = this.scores.get(playerId)
        if (score) this.scores.set(playerId, applyWrongAnswer(score))
        const previewUrl = this.previewUrls.get(this.currentSong.id)
        if (previewUrl) this.io.to(this.code).emit('game:playSong', { previewUrl })
        return { correct: false }
      }

      const maxAttempts = this.settings.answerMode === 'multipleChoice' ? 1 : this.MAX_ATTEMPTS
      const attempts = (this.wrongAttempts.get(playerId) ?? 0) + 1
      this.wrongAttempts.set(playerId, attempts)
      const attemptsLeft = Math.max(0, maxAttempts - attempts)
      if (attemptsLeft === 0) this.hasAnswered.add(playerId)
      if (this.players.has(playerId)) {
        this.io.to(playerId).emit('game:wrongAnswer', { playerId, attemptsLeft })
      }
      if (attemptsLeft === 0) {
        const score = this.scores.get(playerId)
        if (score) this.scores.set(playerId, applyWrongAnswer(score))
      }
      return { correct: false }
    }

    // Bonne réponse en mode buzzer : annuler le timer
    if (this.settings.mode === 'buzzer') {
      if (this.buzzerTimer) { clearTimeout(this.buzzerTimer); this.buzzerTimer = null }
      this.buzzedPlayerId = null
      this.isPaused = false
    }

    this.hasAnswered.add(playerId)

    // Bonne réponse
    const guessTime = (timestamp - this.roundStartedAt) / 1000
    const timeRemaining = Math.max(0, this.settings.playDuration - guessTime)
    const correctOrder = this.correctGuessers.length
    this.correctGuessers.push({ playerId, guessTime })

    const points = calculatePoints(
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
    const humanCount = this.players.size
    if (this.correctGuessers.length >= humanCount) {
      setTimeout(() => this.endRound(), 1500)
    }

    return { correct: true, points }
  }

  // ─── StreamClash ──────────────────────────────

  private startStreamClash(): string | null {
    const shuffled = [...STREAMCLASH_SONGS].sort(() => Math.random() - 0.5)
    this.scPairs = []
    const maxRounds = Math.min(this.settings.rounds, Math.floor(shuffled.length / 2))
    for (let i = 0; i + 1 < shuffled.length && this.scPairs.length < maxRounds; i += 2) {
      this.scPairs.push([shuffled[i], shuffled[i + 1]])
    }
    if (this.scPairs.length === 0) return 'Pas assez de chansons StreamClash'

    for (const [id, player] of this.players) {
      this.scores.set(id, createInitialScore(id, player.name, player.avatarColor))
    }

    this.status = 'playing'
    this.scRoundIndex = -1
    this.scVotes = new Map()
    this.scRevealed = false
    this.gameStartedAt = Date.now()
    this.songsPlayed = []

    this.prefetchScCovers().then(() => this.startNextScRound())
    return null
  }

  private async prefetchScCovers(): Promise<void> {
    const songs = this.scPairs.flat()
    await Promise.all(
      songs.map(async (song) => {
        if (this.scCoverUrls.has(song.id)) return
        const result = await fetchDeezerPreview(song.title, song.artist)
        if (result?.coverUrl) this.scCoverUrls.set(song.id, result.coverUrl)
      })
    )
    console.log(`[StreamClash] ${this.scCoverUrls.size}/${songs.length} pochettes chargées`)
  }

  private startNextScRound() {
    this.scRoundIndex++
    if (this.scRoundIndex >= this.scPairs.length) {
      this.endGame()
      return
    }

    this.scVotes = new Map()
    this.scRevealed = false

    const [sA, sB] = this.scPairs[this.scRoundIndex]
    this.io.to(this.code).emit('streamclash:roundStart', {
      roundNumber: this.scRoundIndex + 1,
      totalRounds: this.scPairs.length,
      songA: { id: sA.id, title: sA.title, artist: sA.artist, year: sA.year, coverUrl: this.scCoverUrls.get(sA.id) },
      songB: { id: sB.id, title: sB.title, artist: sB.artist, year: sB.year, coverUrl: this.scCoverUrls.get(sB.id) },
      timeLimit: 20,
    })

    this.roundTimer = setTimeout(() => {
      if (!this.scRevealed) this.revealScRound()
    }, 20 * 1000)
  }

  handleScVote(playerId: string, side: 'A' | 'B') {
    if (this.settings.mode !== 'streamclash') return
    if (this.scRevealed) return
    if (this.scVotes.has(playerId)) return
    if (!this.players.has(playerId)) return

    this.scVotes.set(playerId, side)

    const votesA = [...this.scVotes.values()].filter(v => v === 'A').length
    const votesB = this.scVotes.size - votesA
    this.io.to(this.code).emit('streamclash:voteUpdate', { votesA, votesB, totalPlayers: this.players.size })

    if (this.scVotes.size >= this.players.size) {
      if (this.roundTimer) { clearTimeout(this.roundTimer); this.roundTimer = null }
      this.revealScRound()
    }
  }

  private revealScRound() {
    if (this.scRevealed) return
    this.scRevealed = true
    if (this.roundTimer) { clearTimeout(this.roundTimer); this.roundTimer = null }

    const [sA, sB] = this.scPairs[this.scRoundIndex]
    const winner: 'A' | 'B' = sA.streams >= sB.streams ? 'A' : 'B'

    const votesA = [...this.scVotes.values()].filter(v => v === 'A').length
    const votesB = this.scVotes.size - votesA

    for (const [pid, vote] of this.scVotes) {
      const score = this.scores.get(pid)
      if (!score) continue
      if (vote === winner) {
        const pts = 100 + Math.min(score.streak * 50, 200)
        this.scores.set(pid, applyCorrectAnswer(score, pts, 0, 0))
      } else {
        this.scores.set(pid, applyWrongAnswer(score))
      }
    }
    for (const [pid] of this.players) {
      if (!this.scVotes.has(pid)) {
        const score = this.scores.get(pid)
        if (score) this.scores.set(pid, { ...score, streak: 0 })
      }
    }

    const leaderboard = this.getLeaderboard()
    this.io.to(this.code).emit('streamclash:voteResult', {
      songA: { id: sA.id, title: sA.title, artist: sA.artist, year: sA.year, streams: sA.streams, coverUrl: this.scCoverUrls.get(sA.id) },
      songB: { id: sB.id, title: sB.title, artist: sB.artist, year: sB.year, streams: sB.streams, coverUrl: this.scCoverUrls.get(sB.id) },
      winner,
      votesA,
      votesB,
      leaderboard,
    })

    setTimeout(() => {
      if (this.status === 'playing') this.startNextScRound()
    }, 5000)
  }

  // ─── Helpers ──────────────────────────────────

  getLeaderboard(): PlayerScore[] {
    return [...this.scores.values()].sort((a, b) => b.score - a.score)
  }

  private getTeamScores(): { A: number; B: number } | undefined {
    if (this.settings.mode !== 'teams') return undefined
    let A = 0, B = 0
    for (const score of this.scores.values()) {
      if (score.teamId === 'A') A += score.score
      else if (score.teamId === 'B') B += score.score
    }
    return { A, B }
  }

  getPublicState(): RoomState {
    const isSC = this.settings.mode === 'streamclash'
    return {
      code: this.code,
      status: this.status,
      players: [...this.players.values()],
      settings: this.settings,
      currentRound: isSC ? this.scRoundIndex + 1 : this.currentRoundIndex + 1,
      totalRounds: isSC ? (this.scPairs.length || this.settings.rounds) : (this.playlist.length || this.settings.rounds),
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
    if (this.buzzerTimer) { clearTimeout(this.buzzerTimer); this.buzzerTimer = null }
  }

  destroy() {
    this.clearTimers()
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer)
  }

  get isEmpty(): boolean {
    return this.players.size === 0
  }
}
