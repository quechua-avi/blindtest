import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePWAInstall } from '../../hooks/usePWAInstall'

export function InstallBanner() {
  const { canInstall, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)

  return (
    <AnimatePresence>
      {canInstall && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="fixed bottom-6 inset-x-0 flex justify-center px-4 z-50 pointer-events-none"
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex items-center gap-3 w-full max-w-sm pointer-events-auto">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <div className="flex items-end gap-0.5 h-5">
                {[0.5, 0.9, 1, 0.7, 0.85].map((h, i) => (
                  <div
                    key={i}
                    className="w-0.5 rounded-full bg-white"
                    style={{ height: `${h * 100}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">Installer BeatBlind</p>
              <p className="text-xs text-slate-500">Joue sans ouvrir le navigateur</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={install}
                className="text-xs font-semibold text-white bg-primary px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Installer
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
