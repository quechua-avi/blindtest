import { forwardRef, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantClasses = {
  primary: 'bg-primary hover:bg-primary-glow text-white shadow-glow-sm',
  secondary: 'bg-bg-card border border-bg-border text-slate-200 hover:border-primary/60',
  ghost: 'text-slate-400 hover:text-white hover:bg-bg-card',
  danger: 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-8 py-3.5 text-base rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...rest }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        disabled={loading || disabled}
        className={`
          font-semibold transition-all duration-200 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]} ${sizeClasses[size]} ${className}
        `}
        {...(rest as any)}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'
