interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  isHost?: boolean
  isAI?: boolean
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-xl',
}

export function Avatar({ name, color, size = 'md', isHost, isAI }: AvatarProps) {
  const initials = isAI ? '🤖' : name.slice(0, 2).toUpperCase()
  return (
    <div className="relative inline-block">
      <div
        className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      {isHost && (
        <span className="absolute -top-1 -right-1 text-xs">👑</span>
      )}
    </div>
  )
}
