import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { createContext, useContext } from 'react'
import { useSocketSetup } from './hooks/useSocket'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { HomePage } from './pages/HomePage'
import { JoinPage } from './pages/JoinPage'
import { LobbyPage } from './pages/LobbyPage'
import { GamePage } from './pages/GamePage'
import { ResultsPage } from './pages/ResultsPage'
import { AdminPage } from './pages/AdminPage'
import { AuthPage } from './pages/AuthPage'
import { SettingsPage } from './pages/SettingsPage'
import { InstallBanner } from './components/ui/InstallBanner'

interface AudioPlayerCtx {
  playSong: (previewUrl: string) => void
  stopSong: () => void
  isPlaying: boolean
}

export const AudioPlayerContext = createContext<AudioPlayerCtx | null>(null)

export function useAudioPlayerContext() {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) throw new Error('useAudioPlayerContext must be used inside AudioPlayerContext')
  return ctx
}

function AppRoutes() {
  useSocketSetup()
  const { playSong, stopSong, isPlaying } = useAudioPlayer()

  return (
    <AudioPlayerContext.Provider value={{ playSong, stopSong, isPlaying }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/lobby/:code" element={<LobbyPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AudioPlayerContext.Provider>
  )
}


export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <InstallBanner />
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
