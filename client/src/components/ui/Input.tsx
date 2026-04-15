import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...rest }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
      )}
      <input
        ref={ref}
        className={`
          w-full bg-bg-card border rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600
          focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60
          transition-all duration-200
          ${error ? 'border-red-500/60' : 'border-bg-border hover:border-bg-border/80'}
          ${className}
        `}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
