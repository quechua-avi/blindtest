import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../socket/socketClient'
import { usePlayerStore, AVATAR_COLORS } from '../store/usePlayerStore'
import { useAuthStore } from '../store/useAuthStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const GENRES = [
  { label: '🏆 Top France',   color: '#10b981' },
  { label: '🎤 Rap Français', color: '#f59e0b' },
  { label: 'Jul',             color: '#0ea5e9' },
  { label: '🇫🇷 Variété FR',  color: '#3b82f6' },
  { label: '📼 Années 2000',  color: '#ec4899' },
  { label: '💿 Années 2010',  color: '#0284c7' },
  { label: '🚀 Années 2020',  color: '#f97316' },
  { label: '⚡ Electronic',   color: '#0891b2' },
  { label: '🔥 Latino',       color: '#ef4444' },
]

const MODES = [
  { icon: '🎵', label: 'Classique',    desc: 'Texte libre ou choix multiple' },
  { icon: '🔔', label: 'Buzzer',       desc: 'Premier à buzzer répond' },
  { icon: '👥', label: 'Équipes',      desc: 'A contre B, score cumulé' },
  { icon: '🕵️', label: 'Saboteur',    desc: 'Démasque l\'imposteur' },
  { icon: '⚡', label: 'StreamClash', desc: 'Qui streame le plus ?' },
]

function GamePreviewCard() {
  const bars = [0.4, 0.75, 1, 0.55, 0.85, 0.5, 0.9, 0.6, 1, 0.5, 0.8, 0.45, 0.7, 0.95, 0.55, 0.7]
  const floatingNotes = [
    { note: '♪', style: { left: -28, top: 32 }, delay: 0 },
    { note: '♫', style: { right: -24, top: 50 }, delay: 0.4 },
    { note: '♩', style: { left: -18, bottom: 60 }, delay: 0.8 },
    { note: '♬', style: { right: -20, bottom: 80 }, delay: 1.2 },
  ]

  return (
    <div className="relative flex-shrink-0">
      {/* glow */}
      <div className="absolute inset-0 bg-primary/15 rounded-full blur-3xl scale-110 pointer-events-none" />

      {/* floating notes */}
      {floatingNotes.map((n, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl text-primary/40 pointer-events-none select-none"
          style={n.style as React.CSSProperties}
          animate={{ y: [0, -10, 0], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: n.delay, ease: 'easeInOut' }}
        >
          {n.note}
        </motion.span>
      ))}

      {/* card */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 w-72">
        {/* round indicator */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-slate-400">Round 5 / 10</span>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">⏱ 12s</span>
        </div>

        {/* album art */}
        <div className="w-full h-28 rounded-2xl mb-4 overflow-hidden relative flex items-center justify-center bg-gradient-to-br from-orange-400 to-amber-600">
          {/* vinyl */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute"
          >
            <svg viewBox="0 0 100 100" width="90" height="90">
              <circle cx="50" cy="50" r="48" fill="#1c0a00" />
              <circle cx="50" cy="50" r="38" fill="#2d1200" />
              {[32, 36, 40, 44].map((r) => (
                <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
              ))}
              <circle cx="50" cy="50" r="22" fill="#431407" />
              <circle cx="50" cy="50" r="10" fill="#ea580c" />
              <circle cx="50" cy="50" r="4" fill="rgba(255,255,255,0.5)" />
            </svg>
          </motion.div>
          <div className="relative text-4xl z-10 drop-shadow-lg select-none">🎵</div>
        </div>

        {/* waveform */}
        <div className="flex items-center gap-px h-7 mb-4">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-primary animate-waveform"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.09}s` }}
            />
          ))}
        </div>

        {/* fake input */}
        <div className="bg-slate-100 rounded-xl px-3 py-2 text-slate-400 text-sm mb-3 flex items-center gap-2">
          <span className="flex-1">Devine le titre…</span>
          <span>✏️</span>
        </div>

        {/* score feed */}
        <div className="space-y-1.5">
          {[
            { name: 'Alex', color: '#f97316', pts: '+850' },
            { name: 'Léa',  color: '#0ea5e9', pts: '+720' },
          ].map((p) => (
            <div key={p.name} className="flex items-center gap-2 text-xs">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ backgroundColor: p.color }}
              >
                {p.name[0]}
              </div>
              <span className="text-slate-500 font-medium">{p.name} a trouvé !</span>
              <span className="ml-auto font-bold text-emerald-500">{p.pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HomePage() {
  const { name, avatarColor, setName, setAvatarColor } = usePlayerStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [pseudo, setPseudo]           = useState(name)
  const [roomCode, setRoomCode]       = useState('')
  const [password, setPassword]       = useState('')
  const [pseudoError, setPseudoError] = useState('')
  const [joinError, setJoinError]     = useState('')
  const [createError, setCreateError] = useState('')
  const [joinLoading, setJoinLoading]         = useState(false)
  const [createLoading, setCreateLoading]     = useState(false)
  const [requirePassword, setRequirePassword] = useState(true)
  const [totalSongs, setTotalSongs]           = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => setRequirePassword(d.requireRoomPassword ?? true))
      .catch(() => {})
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => { if (d.totalSongs > 0) setTotalSongs(d.totalSongs) })
      .catch(() => {})
  }, [])

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
    if (requirePassword && !password.trim()) { setCreateError('Mot de passe requis'); return }
    setCreateError('')
    setCreateLoading(true)
    getSocket().emit('lobby:create', { playerName: trimmed, avatarColor, password: password.trim() || undefined })
    setTimeout(() => setCreateLoading(false), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          {/* Logo */}
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

          <div className="flex-1" />

          {/* Nav */}
          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.username[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-700 hidden sm:block">{user.username}</span>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 cursor-pointer transition-colors"
                >
                  Paramètres
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2.5 py-1.5 cursor-pointer transition-colors hidden sm:block"
                >
                  Connexion
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-xs font-semibold text-white bg-primary rounded-lg px-3 py-1.5 hover:bg-primary/90 cursor-pointer transition-colors"
                >
                  Créer un compte
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-primary/5 rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-100/60 rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24 flex flex-col lg:flex-row items-center gap-14 relative">
          {/* Texte */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <span>🎵</span>
              <span>{totalSongs !== null ? `${totalSongs} titres` : '986 titres'} · 2000–2026</span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
              Le blindtest<br />
              <span className="text-primary">multijoueur</span>
            </h1>
            <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto lg:mx-0">
              Identifie les extraits musicaux avant tes amis. 5 modes de jeu, 9 genres, jusqu'à 16 joueurs en temps réel.
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap mb-8">
              {GENRES.map((g) => (
                <span
                  key={g.label}
                  className="text-xs px-2.5 py-1 rounded-full border font-medium"
                  style={{ backgroundColor: g.color + '12', borderColor: g.color + '40', color: g.color }}
                >
                  {g.label}
                </span>
              ))}
            </div>
            <a
              href="#jouer"
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold rounded-xl px-6 py-3 hover:bg-primary/90 transition-colors text-sm shadow-lg shadow-primary/20"
            >
              Jouer maintenant
              <span>↓</span>
            </a>
          </motion.div>

          {/* Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="hidden lg:flex items-center justify-center"
          >
            <GamePreviewCard />
          </motion.div>
        </div>
      </section>

      {/* ── Comment jouer ──────────────────────────────────────── */}
      <section className="py-14 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-2xl font-bold text-slate-900 text-center mb-10">Comment ça marche ?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { n: '1', icon: '👤', title: 'Crée ton profil', desc: 'Choisis un pseudo et une couleur d\'avatar. Crée un compte pour sauvegarder tes stats.' },
              { n: '2', icon: '🔑', title: 'Rejoins ou crée', desc: 'Partage un code de salle à tes amis, ou entre un code reçu.' },
              { n: '3', icon: '🎧', title: 'Joue !', desc: 'Écoute l\'extrait 30s et trouve le titre ou l\'artiste avant tout le monde.' },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm"
              >
                <div className="text-4xl mb-3">{step.icon}</div>
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mx-auto mb-2">{step.n}</div>
                <h3 className="font-semibold text-slate-900 mb-1">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modes de jeu ───────────────────────────────────────── */}
      <section className="py-14 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-2xl font-bold text-slate-900 text-center mb-2">5 modes de jeu</h2>
          <p className="text-slate-400 text-sm text-center mb-10">Choisis l'ambiance selon ta soirée</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {MODES.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.07 * i }}
                className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors group"
              >
                <div className="text-3xl mb-2">{m.icon}</div>
                <div className="font-semibold text-slate-900 text-sm mb-1 group-hover:text-primary transition-colors">{m.label}</div>
                <div className="text-slate-400 text-xs leading-relaxed">{m.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compte : bannière ──────────────────────────────────── */}
      {!user && (
        <section className="bg-gradient-to-r from-primary/10 via-orange-50 to-amber-50 border-y border-primary/10">
          <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900 mb-0.5">Sauvegarde tes stats</p>
              <p className="text-slate-500 text-sm">Crée un compte pour suivre ton score, ta série et tes victoires entre les parties.</p>
            </div>
            <button
              onClick={() => navigate('/auth')}
              className="flex-shrink-0 bg-primary text-white font-semibold rounded-xl px-5 py-2.5 hover:bg-primary/90 transition-colors text-sm shadow-md shadow-primary/20 cursor-pointer"
            >
              Créer un compte gratuit →
            </button>
          </div>
        </section>
      )}

      {/* ── Jouer ──────────────────────────────────────────────── */}
      <section id="jouer" className="flex-1 flex flex-col items-center px-4 pt-14 pb-12 bg-slate-50">
        <div className="w-full max-w-2xl">
          <h2 className="font-display text-2xl font-bold text-slate-900 text-center mb-2">Prêt à jouer ?</h2>
          {user ? (
            <p className="text-slate-400 text-sm text-center mb-8">
              Connecté en tant que <span className="font-semibold text-slate-700">{user.username}</span>
            </p>
          ) : (
            <p className="text-slate-400 text-sm text-center mb-8">
              Joue en invité ou{' '}
              <button onClick={() => navigate('/auth')} className="text-primary font-semibold hover:underline cursor-pointer">
                crée un compte
              </button>{' '}
              pour sauvegarder tes stats.
            </p>
          )}

          {/* Profil */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-4"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Ton profil</p>
              <div className="flex items-center gap-4">
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

          {/* Rejoindre / Créer */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Rejoindre */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">Rejoindre</h3>
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
                <h3 className="font-display text-xl font-bold text-slate-900">Créer une partie</h3>
                <p className="text-slate-400 text-sm mt-0.5">Tu seras l'hôte</p>
              </div>
              {requirePassword && (
                <Input
                  light
                  placeholder="Mot de passe de la salle"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  error={createError}
                />
              )}
              {!requirePassword && createError && <p className="text-red-500 text-sm">{createError}</p>}
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
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5 h-4">
              {[0.5, 0.9, 1, 0.7, 0.85].map((h, i) => (
                <div key={i} className="w-0.5 rounded-full bg-slate-300" style={{ height: `${h * 100}%` }} />
              ))}
            </div>
            <span className="font-display text-sm font-bold text-slate-400">BeatBlind</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm flex-wrap justify-center">
            {user ? (
              <button
                onClick={() => navigate('/settings')}
                className="text-slate-500 hover:text-primary transition-colors cursor-pointer"
              >
                Mes paramètres
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-slate-500 hover:text-primary transition-colors cursor-pointer"
                >
                  Connexion
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-slate-500 hover:text-primary transition-colors cursor-pointer"
                >
                  Créer un compte
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/admin')}
              className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer text-xs border border-slate-200 rounded-lg px-2.5 py-1"
            >
              ⚙️ Administration
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
