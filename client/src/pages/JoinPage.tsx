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
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-5xl mb-3">🎵</div>
        <h1 className="font-display text-3xl font-bold text-white">Rejoindre la partie</h1>
        <p className="text-slate-400 mt-1">
          Code : <span className="text-primary-light font-bold tracking-widest">{code}</span>
        </p>
      </motion.div>

      <div className="bg-bg-card border border-bg-border rounded-2xl p-6 w-full max-w-sm space-y-4">
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
          Rejoindre
        </Button>
      </div>
    </div>
  )
}
