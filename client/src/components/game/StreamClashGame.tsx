import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../../socket/socketClient'
import { useGameStore } from '../../store/useGameStore'

function formatStreams(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} Mrd`
  return `${n} M`
}

function SongCard({
  song,
  side,
  voted,
  isReveal,
  isWinner,
  onClick,
}: {
  song: { id: string; title: string; artist: string; year: number; coverUrl?: string; streams?: number }
  side: 'A' | 'B'
  voted: 'A' | 'B' | null
  isReveal: boolean
  isWinner: boolean
  onClick: () => void
}) {
  const canVote = !isReveal && voted === null
  const isSelected = voted === side

  const borderClass = isReveal
    ? isWinner
      ? 'border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.25)]'
      : 'border-slate-200 opacity-60'
    : isSelected
      ? 'border-violet-400 shadow-md'
      : canVote
        ? 'border-slate-200 hover:border-violet-300 hover:shadow-md cursor-pointer'
        : 'border-slate-200'

  return (
    <motion.div
      layout
      onClick={canVote ? onClick : undefined}
      whileHover={canVote ? { scale: 1.02 } : {}}
      whileTap={canVote ? { scale: 0.98 } : {}}
      className={`relative flex-1 rounded-2xl border-2 bg-white transition-all duration-300 overflow-hidden ${borderClass}`}
    >
      {/* Badge côté */}
      <div className="absolute top-3 left-3 z-10">
        <span className="text-xs font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
          {side}
        </span>
      </div>

      {/* Couronne gagnant */}
      {isReveal && isWinner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="absolute top-3 right-3 z-10 text-xl"
        >
          👑
        </motion.div>
      )}

      {/* Pochette */}
      <div className="w-full aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
        {song.coverUrl ? (
          <img
            src={song.coverUrl}
            alt={song.title}
            className={`w-full h-full object-cover transition-all duration-500 ${isReveal && !isWinner ? 'grayscale opacity-70' : ''}`}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-300">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-4 space-y-1">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{song.year}</p>
        <p className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{song.title}</p>
        <p className="text-slate-500 text-xs truncate">{song.artist}</p>
      </div>

      {/* Streams révélés après vote */}
      <AnimatePresence>
        {isReveal && song.streams !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`mx-4 mb-4 rounded-xl px-3 py-2 text-center ${
              isWinner
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-slate-50 border border-slate-200'
            }`}
          >
            <p className={`text-xl font-black ${isWinner ? 'text-amber-600' : 'text-slate-400'}`}>
              {formatStreams(song.streams)}
            </p>
            <p className="text-xs text-slate-400">streams Spotify</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function StreamClashGame() {
  const navigate = useNavigate()
  const {
    scRoundNumber,
    scTotalRounds,
    scSongA,
    scSongB,
    scVotesA,
    scVotesB,
    scTotalPlayers,
    myScVote,
    scReveal,
    leaderboard,
    myPlayerId,
    isHost,
    setMyScVote,
  } = useGameStore()

  const handleVote = (side: 'A' | 'B') => {
    if (myScVote !== null || scReveal !== null) return
    setMyScVote(side)
    getSocket().emit('streamclash:vote', { side })
  }

  const handleSkip = () => {
    if (!isHost) return
    getSocket().emit('game:skipSong')
  }

  const handleEnd = () => {
    if (!isHost) return
    getSocket().emit('game:end')
  }

  const isReveal = scReveal !== null
  const winner = scReveal?.winner ?? null
  const totalVotes = (scReveal?.votesA ?? 0) + (scReveal?.votesB ?? 0)

  const songADisplay = isReveal && scReveal
    ? { ...scReveal.songA }
    : scSongA ?? undefined
  const songBDisplay = isReveal && scReveal
    ? { ...scReveal.songB }
    : scSongB ?? undefined

  if (!scSongA && !scReveal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-display font-extrabold text-slate-900 text-base">
              Stream<span className="text-violet-600">Clash</span>
            </span>
            <span className="text-slate-400 text-xs ml-1">
              {scRoundNumber}/{scTotalRounds}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isHost && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkip}
                  className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 cursor-pointer transition-colors"
                >
                  ⏭ Skip
                </button>
                <button
                  onClick={handleEnd}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2.5 py-1 cursor-pointer transition-colors"
                >
                  Terminer
                </button>
              </div>
            )}
            <button
              onClick={() => { getSocket().emit('lobby:leave'); navigate('/') }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              Quitter
            </button>
          </div>
        </div>
      </header>

      {/* Barre de progression */}
      <div className="w-full bg-slate-200 h-1">
        <div
          className="h-1 bg-violet-500 transition-all duration-500"
          style={{ width: `${(scRoundNumber / scTotalRounds) * 100}%` }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-5 max-w-2xl mx-auto w-full">
        {/* Question */}
        <div className="w-full">
          <p className="text-slate-900 font-bold text-lg">Quelle chanson a le plus de streams ?</p>
          <p className="text-slate-400 text-xs mt-0.5">Rap français · Spotify</p>
        </div>

        {/* Feedback reveal */}
        <AnimatePresence mode="wait">
          {isReveal && scReveal && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`w-full rounded-xl px-4 py-3 ${
                myScVote === winner
                  ? 'bg-emerald-50 border border-emerald-200'
                  : myScVote === null
                    ? 'bg-slate-100 border border-slate-200'
                    : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`font-bold text-sm ${
                  myScVote === winner ? 'text-emerald-700' : myScVote === null ? 'text-slate-500' : 'text-red-600'
                }`}>
                  {myScVote === winner
                    ? '✅ Bonne réponse !'
                    : myScVote === null
                      ? '⏱ Temps écoulé — tu n\'as pas voté'
                      : `❌ Raté — c'était le ${winner === 'A' ? scReveal.songA.title : scReveal.songB.title}`
                  }
                </p>
                {totalVotes > 0 && (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-semibold text-violet-600">{scReveal.votesA}</span>
                    <span className="text-slate-300">vs</span>
                    <span className="font-semibold text-violet-600">{scReveal.votesB}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {!isReveal && myScVote !== null && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-xl px-4 py-3 bg-violet-50 border border-violet-200"
            >
              <div className="flex items-center justify-between">
                <p className="text-violet-700 font-semibold text-sm">
                  ✓ Vote enregistré · En attente des autres…
                </p>
                <p className="text-xs text-violet-500 font-bold">
                  {scVotesA + scVotesB}/{scTotalPlayers}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cartes A et B */}
        {songADisplay && songBDisplay && (
          <div className="flex gap-3 w-full">
            <SongCard
              song={songADisplay}
              side="A"
              voted={myScVote}
              isReveal={isReveal}
              isWinner={winner === 'A'}
              onClick={() => handleVote('A')}
            />

            <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
              <div className="w-px h-16 bg-slate-200" />
              <span className="text-slate-400 font-black text-xs tracking-widest py-1">VS</span>
              <div className="w-px h-16 bg-slate-200" />
            </div>

            <SongCard
              song={songBDisplay}
              side="B"
              voted={myScVote}
              isReveal={isReveal}
              isWinner={winner === 'B'}
              onClick={() => handleVote('B')}
            />
          </div>
        )}

        {!isReveal && myScVote === null && (
          <p className="text-slate-400 text-xs animate-pulse">Clique sur la carte de ton choix</p>
        )}

        {/* Mini leaderboard */}
        {isReveal && scReveal && scReveal.leaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
          >
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Classement</p>
            <div className="space-y-2">
              {scReveal.leaderboard.slice(0, 5).map((p, i) => (
                <div
                  key={p.playerId}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    p.playerId === myPlayerId ? 'bg-violet-50 border border-violet-100' : 'bg-slate-50'
                  }`}
                >
                  <span className="text-sm font-bold text-slate-400 w-5 text-center">{i + 1}</span>
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.playerName[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{p.playerName}</span>
                  <span className="text-sm font-bold text-violet-600 tabular-nums">{p.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
