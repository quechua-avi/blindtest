import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-bg-card border border-bg-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
              {title && (
                <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
