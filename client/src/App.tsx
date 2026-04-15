import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useSocketSetup } from './hooks/useSocket'
import { HomePage } from './pages/HomePage'
import { JoinPage } from './pages/JoinPage'
import { LobbyPage } from './pages/LobbyPage'
import { GamePage } from './pages/GamePage'
import { ResultsPage } from './pages/ResultsPage'

function AppRoutes() {
  useSocketSetup()

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/join/:code" element={<JoinPage />} />
      <Route path="/lobby/:code" element={<LobbyPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
