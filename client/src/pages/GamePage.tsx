import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import { useYouTubePlayer } from '../hooks/useYouTubePlayer'
import { Countdown } from '../components/game/Countdown'
import { AnswerInput } from '../components/game/AnswerInput'
import { MultipleChoice } from '../components/game/MultipleChoice'
import { Leaderboard } from '../components/game/Leaderboard'
import { ScoreFeed } from '../components/game/ScoreFeed'
import { ReactionOverlay } from '../components/game/ReactionOverlay'
import { HostControls } from '../components/game/HostControls'
import { WaveformVisualizer } from '../components/game/WaveformVisualizer'
import { RoundReveal } from '../components/game/RoundReveal'
import { ChatPanel } from '../components/game/ChatPanel'
import { Badge } from '../components/ui/Badge'
import { GENRE_LABELS, GENRE_COLORS, DECADE_LABELS } from '../types/game'
import type { Genre } from '../types/game'

export function GamePage() {
  const navigate = useNavigate()
  const { status, currentRound, settings, revealedSong, pendingSong } = useGameStore()
  const { containerRef, playSong, stopSong } = useYouTubePlayer()

  useEffect(() => {
    if (status === 'idle') navigate('/')
    if (status === 'results') navigate('/results')
  }, [status, navigate])

  // Déclencher la lecture dès que pendingSong change dans le store
  // (le store est mis à jour par useSocket dès réception de game:playSong,
  // même avant que GamePage soit monté → plus de race condition)
  useEffect(() => {
    if (pendingSong) {
      playSong(pendingSong.ytId, pendingSong.startSeconds)
    }
  }, [pendingSong, playSong])

  // Arrêter la musique à la fin du round ou de la partie
  useEffect(() => {
    if (status === 'roundEnd' || status === 'results') {
      stopSong()
    }
  }, [status, stopSong])

  const isPlaying = status === 'playing'
  const isReveal = status === 'roundEnd'

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Iframe YouTube caché */}
      <div
        ref={containerRef}
        style={{ position: 'fixed', left: '-9999px', width: 1, height: 1 }}
        aria-hidden="true"
      />

      {/* Score feed flottant */}
      <ScoreFeed />

      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          {currentRound && (
            <>
              <Badge
                label={GENRE_LABELS[currentRound.genre]}
                color={GENRE_COLORS[currentRound.genre]}
              />
              <Badge
                label={DECADE_LABELS[currentRound.decade]}
                className="bg-bg-card border border-bg-border text-slate-400"
              />
              <span className="text-slate-500 text-sm hidden sm:inline">
                Round {currentRound.roundNumber}/{currentRound.totalRounds}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <HostControls />
        </div>
      </header>

      {/* Corps du jeu */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-32 max-w-5xl mx-auto w-full">
        {isPlaying && (
          <>
            {/* Timer + Waveform */}
            <div className="flex items-center gap-8">
              <Countdown />
              <div className="w-48 sm:w-72">
                <WaveformVisualizer genre={currentRound?.genre as Genre | undefined} isPlaying={true} />
              </div>
            </div>

            {/* Input ou choix multiple */}
            {settings.answerMode === 'text' ? <AnswerInput /> : <MultipleChoice />}
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

      {/* Sidebar leaderboard (desktop uniquement, visible en playing) */}
      {isPlaying && (
        <aside className="fixed right-4 top-20 w-56 hidden xl:block">
          <div className="bg-bg-card/80 backdrop-blur border border-bg-border rounded-2xl p-4">
            <Leaderboard compact />
          </div>
        </aside>
      )}

      {/* Chat + Réactions */}
      <ChatPanel />
      <ReactionOverlay />
    </div>
  )
}
