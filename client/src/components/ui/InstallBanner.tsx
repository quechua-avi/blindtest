import { motion, AnimatePresence } from 'framer-motion'
import { usePWAInstall } from '../../hooks/usePWAInstall'

export function InstallBanner() {
  const { canInstall, install } = usePWAInstall()

  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-4 flex items-center gap-3">
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
              <p className="text-xs text-slate-500 truncate">Joue sans ouvrir le navigateur</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={install}
                className="text-xs font-semibold text-white bg-primary px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Installer
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
