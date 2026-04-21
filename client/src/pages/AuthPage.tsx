import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { usePlayerStore } from '../store/usePlayerStore'

type Tab = 'login' | 'register'

export function AuthPage() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? 'login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const { setAuth } = useAuthStore()
  const { setName, setAvatarColor } = usePlayerStore()
  const navigate = useNavigate()

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = tab === 'login'
        ? { email, password }
        : { email, password, username }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }

      setAuth(data.token, data.user)
      setName(data.user.username)
      setAvatarColor(data.user.avatarColor)
      navigate('/')
    } catch {
      setError('Impossible de joindre le serveur')
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit() }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 mb-8 group">
        <div className="flex items-end gap-0.5 h-5">
          {[0.5, 0.9, 1, 0.7, 0.85].map((h, i) => (
            <div key={i} className="w-1 rounded-full bg-primary animate-waveform"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
        <span className="font-display text-xl font-extrabold text-slate-900">
          Beat<span className="text-primary">Blind</span>
        </span>
      </a>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 w-full max-w-sm"
      >
        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === 'login' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {tab === 'register' && (
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Pseudo</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Ton pseudo en jeu"
                  maxLength={20}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKey}
                placeholder="ton@email.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKey}
                placeholder={tab === 'register' ? '6 caractères minimum' : '••••••••'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm"
              />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm">
                {error}
              </motion.p>
            )}

            <motion.button
              onClick={submit}
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-40 cursor-pointer hover:bg-primary/90 transition-colors text-sm mt-1"
            >
              {loading ? '...' : tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </motion.button>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-xs text-slate-400 mt-4">
          {tab === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
          <button
            onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError('') }}
            className="text-primary font-semibold hover:underline cursor-pointer"
          >
            {tab === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
