import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../socket/socketClient'
import { usePlayerStore } from '../store/usePlayerStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

type View = 'home' | 'create' | 'join'

export function HomePage() {
  const [view, setView] = useState<View>('home')
  const [roomCode, setRoomCode] = useState('')
  const { name, setName } = usePlayerStore()
  const [localName, setLocalName] = useState(name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createPassword, setCreatePassword] = useState('')

  const handleCreate = () => {
    const trimmed = localName.trim()
    if (!trimmed) { setError('Entre ton pseudo'); return }
    if (createPassword !== 'buzzyquizpitchounes') { setError('Mot de passe incorrect'); return }
    setError('')
    setName(trimmed)
    setLoading(true)
    getSocket().emit('lobby:create', { playerName: trimmed })
    setTimeout(() => setLoading(false), 3000)
  }

  const handleJoin = () => {
    const trimmed = localName.trim()
    const code = roomCode.trim().toUpperCase()
    if (!trimmed) { setError('Entre ton pseudo'); return }
    if (code.length !== 6) { setError('Code de salle invalide (6 caractères)'); return }
    setError('')
    setName(trimmed)
    setLoading(true)
    getSocket().emit('lobby:join', { roomCode: code, playerName: trimmed })
    setTimeout(() => setLoading(false), 3000)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
      {/* Background déco */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 relative"
      >
        <div className="text-7xl mb-4">🎵</div>
        <h1 className="font-display text-5xl font-extrabold text-white mb-3">
          Beat<span className="text-primary">Blind</span>
        </h1>
        <p className="text-slate-400 text-lg">
          Blindtest musical multijoueur · 2000–2026
        </p>
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {['Pop', 'Hip-Hop', 'Electronic', 'R&B', 'Musique Française', 'Latin'].map((g) => (
            <span key={g} className="text-xs bg-bg-card border border-bg-border text-slate-500 px-2 py-0.5 rounded-full">
              {g}
            </span>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-4 w-full max-w-xs"
          >
            <Button size="lg" onClick={() => setView('create')} className="w-full">
              🎮 Créer une partie
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setView('join')} className="w-full">
              🔗 Rejoindre une partie
            </Button>
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-bg-card border border-bg-border rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <h2 className="font-display text-xl font-bold text-white">Créer une salle</h2>
            <Input
              label="Ton pseudo"
              placeholder="Ex: Marvin"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <Input
              label="Mot de passe"
              placeholder="••••••••"
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              error={error}
            />
            <Button onClick={handleCreate} loading={loading} className="w-full">
              Créer la salle
            </Button>
            <Button variant="ghost" onClick={() => setView('home')} className="w-full text-slate-500">
              ← Retour
            </Button>
          </motion.div>
        )}

        {view === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-bg-card border border-bg-border rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <h2 className="font-display text-xl font-bold text-white">Rejoindre une salle</h2>
            <Input
              label="Code de la salle"
              placeholder="ACDE7J"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              className="uppercase tracking-widest text-center font-bold text-lg"
              maxLength={6}
              autoFocus
            />
            <Input
              label="Ton pseudo"
              placeholder="Ex: Marvin"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              maxLength={20}
              error={error}
            />
            <Button onClick={handleJoin} loading={loading} className="w-full">
              Rejoindre
            </Button>
            <Button variant="ghost" onClick={() => setView('home')} className="w-full text-slate-500">
              ← Retour
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
