import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'

interface RoomCodeDisplayProps {
  code: string
  horizontal?: boolean
}

export function RoomCodeDisplay({ code, horizontal }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const joinUrl = `${window.location.origin}/join/${code}`

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (horizontal) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* QR code */}
        <div className="flex-shrink-0 bg-white p-3 rounded-xl">
          <QRCodeSVG value={joinUrl} size={100} />
        </div>

        {/* Infos */}
        <div className="flex-1 text-center sm:text-left">
          <p className="text-slate-500 text-xs mb-1">Code de la salle</p>
          <motion.button
            onClick={copyLink}
            whileTap={{ scale: 0.97 }}
            className="font-display text-5xl font-extrabold tracking-widest text-white hover:text-primary-light transition-colors"
          >
            {code}
          </motion.button>
          <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
            <motion.p
              animate={{ opacity: copied ? 1 : 0 }}
              className="text-emerald-400 text-xs"
            >
              Lien copié !
            </motion.p>
            {!copied && (
              <button
                onClick={copyLink}
                className="text-xs text-slate-500 hover:text-primary-light border border-bg-border hover:border-primary/40 px-3 py-1 rounded-lg transition-all"
              >
                📋 Copier le lien d'invitation
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-slate-400 text-sm mb-2">Code de la salle</p>
        <motion.button
          onClick={copyLink}
          whileTap={{ scale: 0.97 }}
          className="font-display text-5xl font-extrabold tracking-widest text-white cursor-pointer hover:text-primary-light transition-colors"
        >
          {code}
        </motion.button>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: copied ? 1 : 0 }}
          className="text-emerald-400 text-sm mt-1"
        >
          Copié !
        </motion.p>
      </div>

      <div className="bg-white p-3 rounded-xl">
        <QRCodeSVG value={joinUrl} size={120} />
      </div>
      <p className="text-slate-500 text-xs text-center">Scanne pour rejoindre</p>
    </div>
  )
}
