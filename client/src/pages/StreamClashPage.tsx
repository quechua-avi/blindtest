import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

interface Song {
  id: string
  title: string
  artist: string
  year: number
  streams: number
  coverUrl?: string
}

interface HistoryEntry {
  songA: Song
  songB: Song
  vote: 'A' | 'B' | null
  winner: 'A' | 'B'
  wasCorrect: boolean
}

type Phase = 'loading' | 'lobby' | 'playing' | 'reveal' | 'results'

const VOTE_DURATION = 12
const REVEAL_MS = 3200
const ROUND_OPTIONS = [5, 10, 15]

// ─── Formatage ─────────────────────────────────────────────────────────────

function formatStreams(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} Mrd`
  return `${n} M`
}

// ─── Composant carte chanson ────────────────────────────────────────────────

function SongCard({
  song,
  side,
  phase,
  voted,
  isWinner,
  onClick,
}: {
  song: Song
  side: 'A' | 'B'
  phase: Phase
  voted: 'A' | 'B' | null
  isWinner: boolean
  onClick: () => void
}) {
  const isPlaying = phase === 'playing'
  const isReveal = phase === 'reveal'
  const isSelected = voted === side
  const canVote = isPlaying && voted === null

  const borderClass = isReveal
    ? isWinner
      ? 'border-amber-400 shadow-[0_0_32px_rgba(251,191,36,0.4)]'
      : 'border-slate-700 opacity-60'
    : isSelected
      ? 'border-primary/60 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
      : canVote
        ? 'border-slate-700 hover:border-slate-500 hover:shadow-lg cursor-pointer'
        : 'border-slate-700'

  return (
    <motion.div
      layout
      onClick={canVote ? onClick : undefined}
      whileHover={canVote ? { scale: 1.02 } : {}}
      whileTap={canVote ? { scale: 0.98 } : {}}
      className={`relative flex-1 rounded-2xl border-2 bg-bg-card transition-all duration-300 overflow-hidden ${borderClass}`}
    >
      {/* Badge côté */}
      <div className="absolute top-3 left-3 z-10">
        <span className="text-xs font-black text-slate-500 bg-slate-800 rounded-full px-2 py-0.5">
          {side}
        </span>
      </div>

      {/* Couronne si gagnant */}
      {isReveal && isWinner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="absolute top-3 right-3 z-10 text-2xl"
        >
          👑
        </motion.div>
      )}

      {/* Pochette */}
      <div className="w-full aspect-square bg-slate-800 flex items-center justify-center overflow-hidden">
        {song.coverUrl ? (
          <img
            src={song.coverUrl}
            alt={song.title}
            className={`w-full h-full object-cover transition-all duration-500 ${isReveal && !isWinner ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-600">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-4 space-y-1">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{song.year}</p>
        <p className="font-bold text-white text-sm leading-tight line-clamp-2">{song.title}</p>
        <p className="text-slate-400 text-xs truncate">{song.artist}</p>
      </div>

      {/* Streams (révélés après vote) */}
      <AnimatePresence>
        {isReveal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`mx-4 mb-4 rounded-xl px-3 py-2 text-center ${
              isWinner
                ? 'bg-amber-400/15 border border-amber-400/30'
                : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <p className={`text-xl font-black ${isWinner ? 'text-amber-300' : 'text-slate-400'}`}>
              {formatStreams(song.streams)}
            </p>
            <p className="text-xs text-slate-500">streams Spotify</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Anneau de timer ────────────────────────────────────────────────────────

function TimerRing({ timeLeft, total }: { timeLeft: number; total: number }) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const progress = timeLeft / total
  const strokeDashoffset = circumference * (1 - progress)
  const color = timeLeft <= 3 ? '#ef4444' : timeLeft <= 6 ? '#f59e0b' : '#8b5cf6'

  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="#1e1e2e" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <span className={`text-lg font-black tabular-nums`} style={{ color }}>
        {timeLeft}
      </span>
    </div>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────

export function StreamClashPage() {
  const navigate = useNavigate()

  const [songs, setSongs] = useState<Song[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [totalRounds, setTotalRounds] = useState(10)
  const [rounds, setRounds] = useState<[Song, Song][]>([])
  const [roundIdx, setRoundIdx] = useState(0)
  const [vote, setVote] = useState<'A' | 'B' | null>(null)
  const [timeLeft, setTimeLeft] = useState(VOTE_DURATION)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Refs pour les callbacks asynchrones (évite les stale closures)
  const phaseRef = useRef<Phase>('loading')
  const roundIdxRef = useRef(0)
  const voteRef = useRef<'A' | 'B' | null>(null)
  const streakRef = useRef(0)
  const roundsRef = useRef<[Song, Song][]>([])
  const totalRoundsRef = useRef(10)

  phaseRef.current = phase
  roundIdxRef.current = roundIdx
  voteRef.current = vote
  streakRef.current = streak
  roundsRef.current = rounds
  totalRoundsRef.current = totalRounds

  const current = rounds[roundIdx]
  const songA = current?.[0]
  const songB = current?.[1]

  // Chargement des chansons
  useEffect(() => {
    fetch('/api/streamclash/songs')
      .then((r) => r.json())
      .then((data: Song[]) => {
        setSongs(data)
        setPhase('lobby')
      })
      .catch(() => setPhase('lobby'))
  }, [])

  // Timer décrémental (redémarre à chaque nouveau round)
  useEffect(() => {
    if (phase !== 'playing') return
    setTimeLeft(VOTE_DURATION)
    const id = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [phase, roundIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timeout : révéler quand le timer atteint 0
  useEffect(() => {
    if (timeLeft === 0 && phaseRef.current === 'playing' && voteRef.current === null) {
      doReveal(null)
    }
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  const doReveal = useCallback((userVote: 'A' | 'B' | null) => {
    if (phaseRef.current !== 'playing') return
    const idx = roundIdxRef.current
    const pair = roundsRef.current[idx]
    if (!pair) return

    const [sA, sB] = pair
    const winner: 'A' | 'B' = sA.streams >= sB.streams ? 'A' : 'B'
    const wasCorrect = userVote !== null && userVote === winner

    const currentStreak = streakRef.current
    const newStreak = wasCorrect ? currentStreak + 1 : 0
    const points = wasCorrect ? 100 + Math.min(newStreak * 30, 120) : 0

    phaseRef.current = 'reveal'
    voteRef.current = userVote
    streakRef.current = newStreak

    setVote(userVote)
    setPhase('reveal')
    setHistory((h) => [...h, { songA: sA, songB: sB, vote: userVote, winner, wasCorrect }])

    if (wasCorrect) {
      setScore((s) => s + points)
      setStreak(newStreak)
      setCorrect((c) => c + 1)
    } else {
      setStreak(0)
    }

    // Avancement automatique après le reveal
    setTimeout(() => {
      const nextIdx = idx + 1
      const total = totalRoundsRef.current
      if (nextIdx >= total || nextIdx >= roundsRef.current.length) {
        phaseRef.current = 'results'
        setPhase('results')
      } else {
        roundIdxRef.current = nextIdx
        voteRef.current = null
        phaseRef.current = 'playing'
        setRoundIdx(nextIdx)
        setVote(null)
        setPhase('playing')
      }
    }, REVEAL_MS)
  }, [])

  const handleVote = (choice: 'A' | 'B') => {
    if (phaseRef.current !== 'playing' || voteRef.current !== null) return
    doReveal(choice)
  }

  const startGame = () => {
    if (songs.length < 2) return
    const shuffled = [...songs].sort(() => Math.random() - 0.5)
    const pairs: [Song, Song][] = []
    for (let i = 0; i + 1 < shuffled.length && pairs.length < totalRounds; i += 2) {
      pairs.push([shuffled[i], shuffled[i + 1]])
    }
    roundsRef.current = pairs
    phaseRef.current = 'playing'
    voteRef.current = null
    streakRef.current = 0

    setRounds(pairs)
    setRoundIdx(0)
    setVote(null)
    setScore(0)
    setStreak(0)
    setCorrect(0)
    setHistory([])
    setPhase('playing')
  }

  const resetToLobby = () => {
    phaseRef.current = 'lobby'
    setPhase('lobby')
    setHistory([])
    setScore(0)
    setStreak(0)
    setCorrect(0)
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="text-5xl mb-2">⚡</div>
            <h1 className="font-display text-4xl font-black text-white tracking-tight">
              Stream<span className="text-primary">Clash</span>
            </h1>
            <p className="text-slate-400 text-base">
              Rap français · Quelle chanson a le plus de streams ?
            </p>
            <p className="text-xs text-slate-600 italic">
              Données Spotify approximatives
            </p>
          </div>

          {/* Sélection de rounds */}
          <div className="bg-bg-card border border-bg-border rounded-2xl p-5 space-y-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Nombre de manches
            </label>
            <div className="flex gap-2">
              {ROUND_OPTIONS.map((n) => (
                <motion.button
                  key={n}
                  onClick={() => setTotalRounds(n)}
                  whileTap={{ scale: 0.92 }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
                    totalRounds === n
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-bg border-bg-border text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {n}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Bouton démarrer */}
          <motion.button
            onClick={startGame}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg cursor-pointer shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
          >
            Jouer seul
          </motion.button>

          {/* Retour */}
          <button
            onClick={() => navigate('/')}
            className="w-full text-center text-sm text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
          >
            ← Retour à l'accueil
          </button>
        </motion.div>
      </div>
    )
  }

  if (phase === 'results') {
    const pct = Math.round((correct / history.length) * 100)
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg space-y-6"
        >
          {/* Score */}
          <div className="text-center space-y-2">
            <div className="text-4xl">{pct >= 80 ? '🔥' : pct >= 60 ? '👏' : pct >= 40 ? '🎵' : '💀'}</div>
            <h2 className="font-display text-3xl font-black text-white">
              {score.toLocaleString()} pts
            </h2>
            <p className="text-slate-400 text-base">
              {correct}/{history.length} bonnes réponses · {pct}%
            </p>
          </div>

          {/* Historique */}
          <div className="bg-bg-card border border-bg-border rounded-2xl p-4 space-y-2 max-h-80 overflow-y-auto">
            {history.map((entry, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  entry.wasCorrect ? 'bg-emerald-500/10' : 'bg-red-500/10'
                }`}
              >
                <span className="text-lg">{entry.wasCorrect ? '✅' : '❌'}</span>
                <div className="flex-1 min-w-0 text-xs">
                  <p className="text-white font-semibold truncate">
                    {entry.winner === 'A' ? entry.songA.title : entry.songB.title}
                  </p>
                  <p className="text-slate-500 truncate">
                    {entry.winner === 'A' ? entry.songA.artist : entry.songB.artist} ·{' '}
                    {formatStreams(entry.winner === 'A' ? entry.songA.streams : entry.songB.streams)}
                  </p>
                </div>
                <span className="text-xs text-slate-600 flex-shrink-0">
                  vs {formatStreams(entry.winner === 'A' ? entry.songB.streams : entry.songA.streams)}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={startGame}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold cursor-pointer hover:bg-primary/90 transition-colors"
            >
              Rejouer
            </motion.button>
            <motion.button
              onClick={resetToLobby}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3 rounded-xl border border-bg-border text-slate-400 font-bold cursor-pointer hover:border-slate-600 transition-colors"
            >
              Menu
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Phase playing / reveal ─────────────────────────────────────────────────

  const winner: 'A' | 'B' | null =
    phase === 'reveal' && songA && songB
      ? songA.streams >= songB.streams ? 'A' : 'B'
      : null

  const wasCorrect = phase === 'reveal' && vote !== null && vote === winner

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2 max-w-2xl mx-auto w-full">
        <button
          onClick={() => navigate('/')}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
        >
          ✕ Quitter
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Manche {roundIdx + 1}/{Math.min(totalRounds, rounds.length)}
          </span>
          <span className="text-sm font-bold text-white tabular-nums">
            {score.toLocaleString()} pts
          </span>
          {streak >= 2 && (
            <motion.span
              key={streak}
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              className="text-xs bg-amber-500/20 text-amber-400 rounded-full px-2 py-0.5 font-bold"
            >
              🔥 ×{streak}
            </motion.span>
          )}
        </div>
      </header>

      {/* Barre de progression */}
      <div className="w-full bg-slate-800/60 h-1">
        <div
          className="h-1 bg-primary transition-all duration-300"
          style={{ width: `${((roundIdx + 1) / Math.min(totalRounds, rounds.length)) * 100}%` }}
        />
      </div>

      {/* Corps du jeu */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5 max-w-2xl mx-auto w-full">
        {/* Question + timer */}
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="text-white font-bold text-lg leading-tight">Quelle chanson a le plus de streams ?</p>
            <p className="text-slate-500 text-xs mt-0.5">Rap français · Spotify</p>
          </div>
          {phase === 'playing' && (
            <TimerRing timeLeft={timeLeft} total={VOTE_DURATION} />
          )}
        </div>

        {/* Feedback après vote */}
        <AnimatePresence mode="wait">
          {phase === 'reveal' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`w-full rounded-xl px-4 py-3 text-center ${
                wasCorrect
                  ? 'bg-emerald-500/15 border border-emerald-500/30'
                  : vote === null
                    ? 'bg-slate-800 border border-slate-700'
                    : 'bg-red-500/15 border border-red-500/30'
              }`}
            >
              {wasCorrect ? (
                <p className="text-emerald-400 font-bold">
                  ✅ Bonne réponse !{' '}
                  {streak >= 2 && <span className="text-amber-400">🔥 Combo ×{streak}</span>}
                </p>
              ) : vote === null ? (
                <p className="text-slate-500 font-bold">⏱ Trop lent…</p>
              ) : (
                <p className="text-red-400 font-bold">
                  ❌ Raté — c'était le{' '}
                  <span className="text-white">{winner === 'A' ? songA?.title : songB?.title}</span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cartes A et B */}
        {songA && songB && (
          <div className="flex gap-3 w-full">
            <SongCard
              song={songA}
              side="A"
              phase={phase}
              voted={vote}
              isWinner={winner === 'A'}
              onClick={() => handleVote('A')}
            />

            {/* VS séparateur */}
            <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
              <div className="w-px h-full bg-slate-800" />
              <span className="text-slate-600 font-black text-xs tracking-widest rotate-0 py-2">VS</span>
              <div className="w-px h-full bg-slate-800" />
            </div>

            <SongCard
              song={songB}
              side="B"
              phase={phase}
              voted={vote}
              isWinner={winner === 'B'}
              onClick={() => handleVote('B')}
            />
          </div>
        )}

        {/* Indication clic */}
        {phase === 'playing' && vote === null && (
          <p className="text-slate-600 text-xs animate-pulse">Clique sur la carte de ton choix</p>
        )}
      </main>
    </div>
  )
}
