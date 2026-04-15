import { motion } from 'framer-motion'
import { useCountdown } from '../../hooks/useCountdown'

export function Countdown() {
  const { timeRemaining, isUrgent, radius, circumference, strokeDashoffset } = useCountdown()

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={96}
        height={96}
        className={isUrgent ? 'animate-pulse-fast' : ''}
      >
        {/* Track */}
        <circle
          cx={48}
          cy={48}
          r={radius}
          fill="none"
          stroke="#2a2a3a"
          strokeWidth={6}
        />
        {/* Progress */}
        <motion.circle
          cx={48}
          cy={48}
          r={radius}
          fill="none"
          stroke={isUrgent ? '#ef4444' : '#7c3aed'}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 48 48)"
          style={{ filter: isUrgent ? 'drop-shadow(0 0 8px #ef4444)' : 'drop-shadow(0 0 8px #7c3aed)' }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </svg>
      <span
        className={`absolute text-2xl font-bold font-display tabular-nums ${isUrgent ? 'text-red-400' : 'text-white'}`}
      >
        {timeRemaining}
      </span>
    </div>
  )
}
