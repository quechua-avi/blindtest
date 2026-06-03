import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSocket } from '../socket/socketClient'
import { usePlayerStore } from '../store/usePlayerStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function JoinPage() {
  const { code = '' } = useParams<{ code: string }>()
  const { name, setName } = usePlayerStore()
  const [localName, setLocalName] = useState(name)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = () => {
    const trimmed = localName.trim()
    if (!trimmed) { setError('Entre ton pseudo'); return }
    setError('')
    setName(trimmed)
    setLoading(true)
    getSocket().emit('lobby:join', { roomCode: code, playerName: trimmed })
    setTimeout(() => setLoading(false), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <a href="/" className="flex items-center gap-2 mb-10">
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
      </a>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Code affiché en grand */}
        <div className="text-center mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Tu rejoins la salle
          </p>
          <div
            className="font-display text-5xl font-extrabold tracking-[0.18em] text-slate-900 mb-1
              px-6 py-4 rounded-2xl border border-primary/20 shadow-sm inline-block"
            style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 60%, #fffbeb 100%)' }}
          >
            {code}
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <Input
            label="Ton pseudo"
            placeholder="Ex: Marvin"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={20}
            autoFocus
            error={error}
          />
          <Button onClick={handleJoin} loading={loading} className="w-full">
            Rejoindre 🎵
          </Button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          <a href="/" className="hover:text-slate-600 transition-colors">
            ← Retour à l'accueil
          </a>
        </p>
      </motion.div>
    </div>
  )
}
