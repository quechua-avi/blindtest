import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSocket } from '../socket/socketClient'
import { useGameStore } from '../store/useGameStore'
import { PodiumDisplay } from '../components/results/PodiumDisplay'
import { MVPCards } from '../components/results/MVPCards'
import { SongHistory } from '../components/results/SongHistory'
import { Leaderboard } from '../components/game/Leaderboard'
import { Button } from '../components/ui/Button'

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

export function ResultsPage() {
  const navigate = useNavigate()
  const { finalResults, players, roomCode } = useGameStore()

  useEffect(() => {
    if (!finalResults) navigate('/')
  }, [finalResults, navigate])

  if (!finalResults) return null

  const playAgain = () => {
    if (roomCode) navigate(`/lobby/${roomCode}`)
    else navigate('/')
  }

  const quit = () => {
    getSocket().emit('lobby:leave')
    useGameStore.getState().reset()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="font-display text-4xl font-extrabold text-white">Résultats</h1>
          <p className="text-slate-500 mt-1">
            {finalResults.leaderboard.length} joueurs · {finalResults.songsPlayed.length} chansons · {formatDuration(finalResults.gameDuration)}
          </p>
        </motion.div>

        {/* Vainqueur équipe (mode teams uniquement) */}
        {finalResults.teamScores && finalResults.teamWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            className={`rounded-2xl p-6 text-center border ${
              finalResults.teamWinner === 'tie'
                ? 'bg-slate-700/30 border-slate-600'
                : finalResults.teamWinner === 'A'
                ? 'bg-blue-500/10 border-blue-500/40'
                : 'bg-red-500/10 border-red-500/40'
            }`}
          >
            <div className="text-4xl mb-2">
              {finalResults.teamWinner === 'tie' ? '🤝' : '🏆'}
            </div>
            <p className={`text-2xl font-extrabold font-display ${
              finalResults.teamWinner === 'tie' ? 'text-slate-300' : finalResults.teamWinner === 'A' ? 'text-blue-300' : 'text-red-300'
            }`}>
              {finalResults.teamWinner === 'tie' ? 'Égalité !' : `Équipe ${finalResults.teamWinner} gagne !`}
            </p>
            <div className="flex justify-center gap-8 mt-3">
              <div className="text-center">
                <p className="text-xs text-blue-400 font-semibold">Équipe A</p>
                <p className="text-xl font-bold text-blue-300">{finalResults.teamScores.A.toLocaleString()} pts</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-red-400 font-semibold">Équipe B</p>
                <p className="text-xl font-bold text-red-300">{finalResults.teamScores.B.toLocaleString()} pts</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Podium */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-bg-card border border-bg-border rounded-2xl p-6"
        >
          <PodiumDisplay leaderboard={finalResults.leaderboard} />
        </motion.div>

        {/* MVP */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-display text-lg font-bold text-white mb-3">Distinctions</h2>
          <MVPCards mvp={finalResults.mvp} />
        </motion.div>

        {/* Classement complet */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-bg-card border border-bg-border rounded-2xl p-6"
        >
          <h2 className="font-display text-lg font-bold text-white mb-4">Classement final</h2>
          <Leaderboard />
        </motion.div>

        {/* Historique des chansons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-bg-card border border-bg-border rounded-2xl p-6"
        >
          <SongHistory songsPlayed={finalResults.songsPlayed} players={players} />
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pb-8">
          <Button size="lg" onClick={playAgain} className="w-full sm:w-auto px-10">
            🔄 Rejouer
          </Button>
          <Button size="lg" variant="secondary" onClick={quit} className="w-full sm:w-auto px-10">
            🏠 Accueil
          </Button>
        </div>
      </div>
    </div>
  )
}
