import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import type { Player } from '../../types/game'

interface PlayerListProps {
  players: Player[]
  myPlayerId: string | null
  isHost: boolean
  onKick?: (playerId: string) => void
  onAssignTeam?: (playerId: string, teamId: 'A' | 'B') => void
  showTeams?: boolean
  light?: boolean
}

export function PlayerList({ players, myPlayerId, isHost, onKick, onAssignTeam, showTeams, light }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${light ? 'text-slate-400' : 'text-slate-500'}`}>
        Joueurs · {players.length}
      </p>

      <AnimatePresence>
        {players.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
              light
                ? player.id === myPlayerId
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-slate-50 border-slate-200'
                : player.id === myPlayerId
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-bg-surface border-bg-border'
            }`}
          >
            <Avatar name={player.name} color={player.avatarColor} isHost={player.isHost} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`font-medium truncate text-sm ${light ? 'text-slate-800' : 'text-white'}`}>
                  {player.name}
                </span>
                {player.id === myPlayerId && (
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full leading-none">
                    Toi
                  </span>
                )}
                {player.isHost && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full leading-none">
                    Hôte
                  </span>
                )}
              </div>
              {showTeams && player.teamId && (
                <span className={`text-xs font-medium ${player.teamId === 'A' ? 'text-blue-500' : 'text-red-500'}`}>
                  Équipe {player.teamId}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {showTeams && isHost && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onAssignTeam?.(player.id, 'A')}
                    className={`px-2 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                      player.teamId === 'A'
                        ? 'bg-blue-100 text-blue-600'
                        : light ? 'bg-slate-100 text-slate-500 hover:bg-blue-50' : 'bg-bg-card text-slate-400 hover:bg-blue-500/20'
                    }`}
                  >A</button>
                  <button
                    onClick={() => onAssignTeam?.(player.id, 'B')}
                    className={`px-2 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                      player.teamId === 'B'
                        ? 'bg-red-100 text-red-600'
                        : light ? 'bg-slate-100 text-slate-500 hover:bg-red-50' : 'bg-bg-card text-slate-400 hover:bg-red-500/20'
                    }`}
                  >B</button>
                </div>
              )}

              {/* Indicateur prêt */}
              {!player.isHost && (
                <motion.span
                  animate={player.isReady ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    player.isReady
                      ? 'bg-emerald-100 text-emerald-600'
                      : light ? 'bg-slate-100 text-slate-400' : 'bg-bg-card text-slate-500'
                  }`}
                >
                  {player.isReady ? '✓' : '…'}
                </motion.span>
              )}

              {isHost && player.id !== myPlayerId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onKick?.(player.id)}
                  className="text-slate-300 hover:text-red-400 p-1 transition-colors"
                >
                  ✕
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
