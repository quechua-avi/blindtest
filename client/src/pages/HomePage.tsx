import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../socket/socketClient'
import { usePlayerStore, AVATAR_COLORS } from '../store/usePlayerStore'
import { useAuthStore } from '../store/useAuthStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const GENRES = [
  { label: 'Pop',        color: '#ec4899' },
  { label: 'Hip-Hop',    color: '#f59e0b' },
  { label: 'Electronic', color: '#8b5cf6' },
  { label: 'R&B',        color: '#6366f1' },
  { label: 'Français',   color: '#3b82f6' },
  { label: 'Latin',      color: '#f97316' },
]

const BARS = [0.35, 0.7, 1, 0.55, 0.85, 0.45, 0.9, 0.65, 1, 0.5, 0.75, 0.4]

export function HomePage() {
  const { name, avatarColor, setName, setAvatarColor } = usePlayerStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [pseudo, setPseudo]           = useState(name)
  const [roomCode, setRoomCode]       = useState('')
  const [password, setPassword]       = useState('')
  const [pseudoError, setPseudoError] = useState('')
  const [joinError, setJoinError]     = useState('')
  const [createError, setCreateError] = useState('')
  const [joinLoading, setJoinLoading]     = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  const savePseudo = (): string | null => {
    const trimmed = pseudo.trim()
    if (!trimmed) { setPseudoError('Entre ton pseudo'); return null }
    setPseudoError('')
    setName(trimmed)
    return trimmed
  }

  const handleJoin = () => {
    const trimmed = savePseudo()
    if (!trimmed) return
    const code = roomCode.trim().toUpperCase()
    if (code.length !== 6) { setJoinError('Code invalide (6 caractères)'); return }
    setJoinError('')
    setJoinLoading(true)
    getSocket().emit('lobby:join', { roomCode: code, playerName: trimmed, avatarColor })
    setTimeout(() => setJoinLoading(false), 3000)
  }

  const handleCreate = () => {
    const trimmed = savePseudo()
    if (!trimmed) return
    if (password !== 'buzzyquizpitchounes') { setCreateError('Mot de passe incorrect'); return }
    setCreateError('')
    setCreateLoading(true)
    getSocket().emit('lobby:create', { playerName: trimmed, avatarColor })
    setTimeout(() => setCreateLoading(false), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-end gap-0.5 h-5">
            {[0.5, 0.9, 1, 0.7, 0.85].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-primary animate-waveform"
                style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <span className="font-display text-xl font-extrabold text-slate-900">
            Beat<span className="text-primary">Blind</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.username[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden sm:block">{user.username}</span>
              <button
                onClick={() => logout()}
                className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 cursor-pointer transition-colors"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 cursor-pointer transition-colors"
            >
              Connexion
            </button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          {/* Waveform */}
          <div className="flex items-end justify-center gap-1 h-12 mb-6">
            {BARS.map((h, i) => (
              <div
                key={i}
                className="w-2 rounded-full bg-primary/70 animate-waveform"
                style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>

          <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-3">
            Beat<span className="text-primary">Blind</span>
          </h1>
          <p className="text-slate-500 text-lg mb-6">
            Blindtest musical multijoueur · <span className="font-semibold text-slate-700">986 titres</span> · 2000–2026
          </p>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {GENRES.map((g) => (
              <span
                key={g.label}
                className="text-xs px-3 py-1.5 rounded-full border font-semibold"
                style={{
                  backgroundColor: g.color + '12',
                  borderColor: g.color + '40',
                  color: g.color,
                }}
              >
                {g.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Profil joueur */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-2xl mb-2"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Ton profil</p>
            <div className="flex items-center gap-4">
              {/* Avatar preview */}
              <motion.div
                key={avatarColor}
                initial={{ scale: 0.7, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg select-none"
                style={{ backgroundColor: avatarColor }}
              >
                {pseudo.trim()[0]?.toUpperCase() || '?'}
              </motion.div>
              {/* Pseudo */}
              <div className="flex-1 min-w-0">
                <Input
                  light
                  placeholder="Ton pseudo"
                  value={pseudo}
                  onChange={(e) => { setPseudo(e.target.value); setPseudoError('') }}
                  maxLength={20}
                  error={pseudoError}
                  autoComplete="off"
                />
              </div>
            </div>
            {/* Color picker */}
            <div className="flex flex-wrap gap-2 mt-3">
              {AVATAR_COLORS.map((color) => (
                <motion.button
                  key={color}
                  onClick={() => setAvatarColor(color)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  className="w-7 h-7 rounded-full border-2 cursor-pointer"
                  style={{
                    backgroundColor: color,
                    borderColor: avatarColor === color ? color : 'transparent',
                    outline: avatarColor === color ? `3px solid ${color}40` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Formulaires */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Rejoindre */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">Rejoindre</h2>
              <p className="text-slate-400 text-sm mt-0.5">Entre le code de la salle</p>
            </div>
            <Input
              light
              placeholder="ACDE7J"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              className="uppercase tracking-widest text-center font-bold text-lg"
              maxLength={6}
              autoComplete="off"
            />
            {joinError && <p className="text-red-500 text-xs">{joinError}</p>}
            <Button onClick={handleJoin} loading={joinLoading} className="w-full">
              Rejoindre la partie
            </Button>
          </div>

          {/* Séparateur mobile */}
          <div className="md:hidden flex items-center gap-3 text-slate-300 text-xs">
            <div className="flex-1 h-px bg-slate-200" />
            ou
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Créer */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full pointer-events-none" />
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">Créer une partie</h2>
              <p className="text-slate-400 text-sm mt-0.5">Hôte uniquement</p>
            </div>
            <Input
              light
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
              className="w-full !border-primary/30 hover:!border-primary !text-primary"
            >
              Créer la salle
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-300 text-xs">
        BeatBlind · Blindtest multijoueur
      </footer>
    </div>
  )
}
