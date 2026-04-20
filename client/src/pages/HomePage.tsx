import { useState } from 'react'
import { motion } from 'framer-motion'
import { getSocket } from '../socket/socketClient'
import { usePlayerStore } from '../store/usePlayerStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const GENRES = [
  { label: 'Pop',       color: '#ec4899' },
  { label: 'Hip-Hop',   color: '#f59e0b' },
  { label: 'Electronic',color: '#8b5cf6' },
  { label: 'R&B',       color: '#6366f1' },
  { label: 'Français',  color: '#3b82f6' },
  { label: 'Latin',     color: '#f97316' },
]

const BARS = [0.35, 0.65, 1, 0.55, 0.85, 0.45, 0.75, 1, 0.6, 0.4, 0.8, 0.5]

export function HomePage() {
  const { name, setName } = usePlayerStore()
  const [joinName, setJoinName]       = useState(name)
  const [createName, setCreateName]   = useState(name)
  const [roomCode, setRoomCode]       = useState('')
  const [password, setPassword]       = useState('')
  const [joinError, setJoinError]     = useState('')
  const [createError, setCreateError] = useState('')
  const [joinLoading, setJoinLoading]     = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  const handleJoin = () => {
    const trimmed = joinName.trim()
    const code = roomCode.trim().toUpperCase()
    if (!trimmed) { setJoinError('Entre ton pseudo'); return }
    if (code.length !== 6) { setJoinError('Code invalide (6 caractères)'); return }
    setJoinError('')
    setName(trimmed)
    setJoinLoading(true)
    getSocket().emit('lobby:join', { roomCode: code, playerName: trimmed })
    setTimeout(() => setJoinLoading(false), 3000)
  }

  const handleCreate = () => {
    const trimmed = createName.trim()
    if (!trimmed) { setCreateError('Entre ton pseudo'); return }
    if (password !== 'buzzyquizpitchounes') { setCreateError('Mot de passe incorrect'); return }
    setCreateError('')
    setName(trimmed)
    setCreateLoading(true)
    getSocket().emit('lobby:create', { playerName: trimmed })
    setTimeout(() => setCreateLoading(false), 3000)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 gap-10">
      {/* Blobs déco */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center relative z-10"
      >
        {/* Waveform animée */}
        <div className="flex items-end justify-center gap-1 h-10 mb-5">
          {BARS.map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-primary animate-waveform"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>

        <h1 className="font-display text-6xl font-extrabold text-white tracking-tight mb-2">
          Beat<span className="text-primary">Blind</span>
        </h1>
        <p className="text-slate-400 text-base mb-5">
          Blindtest musical multijoueur · 615 titres · 2000–2026
        </p>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          {GENRES.map((g) => (
            <span
              key={g.label}
              className="text-xs px-2.5 py-1 rounded-full border font-medium"
              style={{
                backgroundColor: g.color + '1a',
                borderColor: g.color + '55',
                color: g.color,
              }}
            >
              {g.label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Panels */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl"
      >
        {/* Rejoindre */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Rejoindre</h2>
            <p className="text-slate-500 text-xs mt-0.5">Entre le code de la salle</p>
          </div>
          <Input
            placeholder="ACDE7J"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
            className="uppercase tracking-widest text-center font-bold text-lg"
            maxLength={6}
            autoComplete="off"
          />
          <Input
            placeholder="Ton pseudo"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={20}
            error={joinError}
            autoComplete="off"
          />
          <Button onClick={handleJoin} loading={joinLoading} className="w-full">
            Rejoindre la partie
          </Button>
        </div>

        {/* Séparateur mobile */}
        <div className="md:hidden flex items-center gap-3 text-slate-600 text-xs">
          <div className="flex-1 h-px bg-bg-border" />
          ou
          <div className="flex-1 h-px bg-bg-border" />
        </div>

        {/* Créer */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-6 space-y-4 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-primary/8 rounded-full blur-2xl pointer-events-none" />
          <div>
            <h2 className="font-display text-xl font-bold text-white">Créer une partie</h2>
            <p className="text-slate-500 text-xs mt-0.5">Hôte uniquement</p>
          </div>
          <Input
            placeholder="Ton pseudo"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            maxLength={20}
            autoComplete="off"
          />
          <Input
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            error={createError}
          />
          <Button
            onClick={handleCreate}
            loading={createLoading}
            variant="secondary"
            className="w-full !border-primary/40 hover:!border-primary !text-primary-light"
          >
            Créer la salle
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
