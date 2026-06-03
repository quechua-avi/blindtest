import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'songs'>('leaderboard')

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
    <div className="min-h-screen bg-bg pb-28">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>
          <h1 className="font-display text-4xl font-extrabold text-white mb-4">Résultats</h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs font-semibold bg-bg-card border border-bg-border px-3 py-1.5 rounded-full text-slate-400">
              👥 {finalResults.leaderboard.length} joueur{finalResults.leaderboard.length > 1 ? 's' : ''}
            </span>
            <span className="text-xs font-semibold bg-bg-card border border-bg-border px-3 py-1.5 rounded-full text-slate-400">
              🎵 {finalResults.songsPlayed.length} chansons
            </span>
            <span className="text-xs font-semibold bg-bg-card border border-bg-border px-3 py-1.5 rounded-full text-slate-400">
              ⏱ {formatDuration(finalResults.gameDuration)}
            </span>
          </div>
        </motion.div>

        {/* ── Vainqueur équipe (mode teams) ──────────────────────── */}
        {finalResults.teamScores && finalResults.teamWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
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

        {/* ── Révélation saboteur ─────────────────────────────────── */}
        {finalResults.saboteurReveal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
            className={`rounded-2xl p-6 text-center border ${
              finalResults.saboteurReveal.caught
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-red-500/10 border-red-500/40'
            }`}
          >
            <div className="text-4xl mb-2">{finalResults.saboteurReveal.caught ? '🎉' : '🕵️'}</div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: finalResults.saboteurReveal.saboteurAvatarColor }}
              >
                {finalResults.saboteurReveal.saboteurName[0]?.toUpperCase()}
              </div>
              <p className="text-xl font-extrabold font-display text-white">
                {finalResults.saboteurReveal.saboteurName}
              </p>
            </div>
            <p className={`font-semibold text-lg ${finalResults.saboteurReveal.caught ? 'text-emerald-300' : 'text-red-300'}`}>
              {finalResults.saboteurReveal.caught
                ? 'était le saboteur · Démasqué ! +500 pts aux bons votants'
                : "était le saboteur · Il s'en est tiré ! +2000 pts"
              }
            </p>
          </motion.div>
        )}

        {/* ── Podium ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-bg-card border border-bg-border rounded-2xl p-8"
        >
          <PodiumDisplay leaderboard={finalResults.leaderboard} />
        </motion.div>

        {/* ── Distinctions ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="font-display text-base font-bold text-slate-400 uppercase tracking-wider mb-3">
            Distinctions
          </h2>
          <MVPCards mvp={finalResults.mvp} />
        </motion.div>

        {/* ── Tabs classement / chansons ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex bg-bg-card border border-bg-border rounded-xl p-1 mb-4">
            {(['leaderboard', 'songs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-bg-surface text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'leaderboard' ? '🏅 Classement' : '🎵 Chansons'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'leaderboard' ? (
              <motion.div
                key="lb"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-bg-card border border-bg-border rounded-2xl p-6"
              >
                <Leaderboard />
              </motion.div>
            ) : (
              <motion.div
                key="songs"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-bg-card border border-bg-border rounded-2xl p-6"
              >
                <SongHistory songsPlayed={finalResults.songsPlayed} players={players} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── CTA fixé en bas ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-bg/95 backdrop-blur border-t border-bg-border px-4 py-4">
        <div className="max-w-sm mx-auto flex gap-3">
          <Button size="lg" onClick={playAgain} className="flex-1">
            🔄 Rejouer
          </Button>
          <Button size="lg" variant="secondary" onClick={quit} className="flex-1">
            🏠 Accueil
          </Button>
        </div>
      </div>
    </div>
  )
}
