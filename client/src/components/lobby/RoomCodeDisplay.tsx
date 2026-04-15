import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'

interface RoomCodeDisplayProps {
  code: string
}

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const joinUrl = `${window.location.origin}/join/${code}`

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-slate-400 text-sm mb-2">Code de la salle</p>
        <motion.button
          onClick={copyCode}
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
