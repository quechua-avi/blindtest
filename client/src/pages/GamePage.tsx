import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'
import { useAudioPlayerContext } from '../App'
import { Countdown } from '../components/game/Countdown'
import { AnswerInput } from '../components/game/AnswerInput'
import { MultipleChoice } from '../components/game/MultipleChoice'
import { Leaderboard } from '../components/game/Leaderboard'
import { ScoreFeed } from '../components/game/ScoreFeed'
import { ReactionOverlay } from '../components/game/ReactionOverlay'
import { HostControls } from '../components/game/HostControls'
import { WaveformVisualizer } from '../components/game/WaveformVisualizer'
import { RoundReveal } from '../components/game/RoundReveal'
import { BuzzerPanel } from '../components/game/BuzzerPanel'
import { ChatPanel } from '../components/game/ChatPanel'
import { Badge } from '../components/ui/Badge'
import { StreamClashGame } from '../components/game/StreamClashGame'
import { GENRE_LABELS, GENRE_COLORS } from '../types/game'
import type { Genre } from '../types/game'

export function GamePage() {
  const navigate = useNavigate()
  const { status, currentRound, settings, pendingSong, activeBuzz, isSaboteur, saboteurAnswer } = useGameStore()
  const { playSong, stopSong } = useAudioPlayerContext()

  useEffect(() => {
    if (status === 'idle') navigate('/')
    if (status === 'results') navigate('/results')
  }, [status, navigate])

  useEffect(() => {
    if (pendingSong) {
      stopSong()
      playSong(pendingSong.previewUrl)
    }
  }, [pendingSong, playSong, stopSong])

  useEffect(() => {
    if (status === 'roundEnd' || status === 'results') {
      stopSong()
    }
  }, [status, stopSong])

  useEffect(() => {
    if (settings.mode !== 'buzzer') return
    if (activeBuzz) {
      stopSong()
    } else if (pendingSong && status === 'playing') {
      playSong(pendingSong.previewUrl)
    }
  }, [activeBuzz]) // eslint-disable-line react-hooks/exhaustive-deps

  const isPlaying = status === 'playing'
  const isReveal = status === 'roundEnd'

  if (settings.mode === 'streamclash') {
    return <StreamClashGame />
  }

  const genreColor = currentRound ? (GENRE_COLORS[currentRound.genre as Genre] ?? '#f97316') : '#f97316'
  const progress = currentRound ? (currentRound.roundNumber / currentRound.totalRounds) * 100 : 0

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <ScoreFeed />

      {/* ── Header sticky ──────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-bg-border">
        {/* Barre de progression des rounds */}
        {currentRound && (
          <div className="w-full h-0.5 bg-bg-border">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: genreColor }}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        )}

        <header className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2">
            {currentRound && (
              <>
                <Badge
                  label={GENRE_LABELS[currentRound.genre]}
                  color={GENRE_COLORS[currentRound.genre]}
                />
                <span className="text-slate-500 text-xs font-medium hidden sm:inline">
                  {currentRound.decade}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentRound && (
              <span className="text-sm tabular-nums">
                <span className="text-white font-bold">{currentRound.roundNumber}</span>
                <span className="text-slate-600">/{currentRound.totalRounds}</span>
              </span>
            )}
            <HostControls />
          </div>
        </header>
      </div>

      {/* ── Corps du jeu ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-32 max-w-5xl mx-auto w-full">

        {/* Indice saboteur */}
        {isPlaying && isSaboteur && saboteurAnswer && (
          <div className="w-full max-w-lg mx-auto bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🕵️</span>
            <div>
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Tu es le saboteur</p>
              <p className="text-amber-200 font-bold">{saboteurAnswer}</p>
            </div>
          </div>
        )}

        {isPlaying && (
          <>
            {/* Timer + Waveform */}
            <div className="flex items-center gap-8">
              <Countdown />
              <div className="w-48 sm:w-72">
                <WaveformVisualizer genre={currentRound?.genre as Genre | undefined} isPlaying={true} />
              </div>
            </div>

            {settings.mode === 'buzzer'
              ? <BuzzerPanel />
              : settings.answerMode === 'text'
                ? <AnswerInput />
                : <MultipleChoice key={currentRound?.roundNumber} />
            }
          </>
        )}

        {isReveal && (
          <>
            <RoundReveal />
            <div className="w-full max-w-lg">
              <Leaderboard />
            </div>
          </>
        )}
      </main>

      {/* Sidebar leaderboard desktop */}
      {isPlaying && (
        <aside className="fixed right-4 top-20 w-56 hidden xl:block">
          <div className="bg-bg-card/80 backdrop-blur border border-bg-border rounded-2xl p-4">
            <Leaderboard compact />
          </div>
        </aside>
      )}

      <ChatPanel />
      <ReactionOverlay />
    </div>
  )
}
