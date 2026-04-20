import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  light?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, light, className = '', ...rest }, ref) => (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-medium mb-1.5 ${light ? 'text-slate-600' : 'text-slate-400'}`}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full rounded-xl px-4 py-3 border transition-all duration-200
          focus:outline-none focus:ring-2
          ${light
            ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 hover:border-slate-300 focus:ring-primary/20 focus:border-primary/50'
            : 'bg-bg-card border-bg-border text-slate-100 placeholder-slate-600 hover:border-bg-border/80 focus:ring-primary/60 focus:border-primary/60'
          }
          ${error ? (light ? 'border-red-400' : 'border-red-500/60') : ''}
          ${className}
        `}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
