interface BadgeProps {
  label: string
  color?: string
  className?: string
}

export function Badge({ label, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}
      style={color ? { backgroundColor: color + '22', color, borderColor: color + '44', border: '1px solid' } : {}}
    >
      {label}
    </span>
  )
}
