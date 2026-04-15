import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/useGameStore'
import { getSocket } from '../../socket/socketClient'

export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const messages = useGameStore((s) => s.messages)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  const send = () => {
    if (!text.trim()) return
    getSocket().emit('chat:message', { text: text.trim() })
    setText('')
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-4 z-30 bg-bg-card border border-bg-border rounded-full w-12 h-12 flex items-center justify-center text-xl shadow-lg hover:border-primary/50 transition-colors"
      >
        💬
        {messages.length > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-xs text-white flex items-center justify-center">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 right-4 z-30 w-72 bg-bg-card border border-bg-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-3 border-b border-bg-border flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Chat</span>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div ref={scrollRef} className="h-48 overflow-y-auto p-3 space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className="text-xs">
                  <span className="font-semibold text-primary-light">{msg.playerName}</span>
                  <span className="text-slate-400 ml-2">{msg.text}</span>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-slate-600 text-xs text-center pt-4">Pas encore de messages</p>
              )}
            </div>

            <div className="p-2 border-t border-bg-border flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Message..."
                className="flex-1 bg-bg-surface border border-bg-border rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-primary/60"
              />
              <button
                onClick={send}
                className="bg-primary text-white rounded-lg px-3 py-1.5 text-sm font-semibold"
              >
                ↵
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
