import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { createContext, useContext } from 'react'
import { useSocketSetup } from './hooks/useSocket'
import { useYouTubePlayer } from './hooks/useYouTubePlayer'
import { HomePage } from './pages/HomePage'
import { JoinPage } from './pages/JoinPage'
import { LobbyPage } from './pages/LobbyPage'
import { GamePage } from './pages/GamePage'
import { ResultsPage } from './pages/ResultsPage'

interface YTPlayerCtx {
  playSong: (videoId: string, startSeconds?: number) => void
  stopSong: () => void
  isAdPlaying: boolean
}

export const YouTubePlayerContext = createContext<YTPlayerCtx | null>(null)

export function useYTPlayer() {
  const ctx = useContext(YouTubePlayerContext)
  if (!ctx) throw new Error('useYTPlayer must be used inside YouTubePlayerContext')
  return ctx
}

function AppRoutes() {
  useSocketSetup()
  const { containerRef, playSong, stopSong, isAdPlaying } = useYouTubePlayer()

  return (
    <>
      {/* Iframe YouTube caché — monté une seule fois pour toute l'app */}
      <div
        ref={containerRef}
        style={{ position: 'fixed', left: '-9999px', width: 1, height: 1 }}
        aria-hidden="true"
      />
      <YouTubePlayerContext.Provider value={{ playSong, stopSong, isAdPlaying }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route path="/lobby/:code" element={<LobbyPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </YouTubePlayerContext.Provider>
    </>
  )
}


export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1a28',
            color: '#f1f5f9',
            border: '1px solid #2a2a3a',
            borderRadius: '12px',
          },
        }}
      />
    </BrowserRouter>
  )
}
