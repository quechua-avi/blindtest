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
      <h3 className={`text-sm font-semibold mb-3 ${light ? 'text-slate-500' : 'text-slate-400'}`}>
        Joueurs · {players.length}
      </h3>
      <AnimatePresence>
        {players.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
              light
                ? 'bg-slate-50 border-slate-200'
                : 'bg-bg-surface border-bg-border'
            }`}
          >
            <Avatar name={player.name} color={player.avatarColor} isHost={player.isHost} isAI={player.isAI} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium truncate ${light ? 'text-slate-800' : 'text-white'}`}>
                  {player.name}
                </span>
                {player.id === myPlayerId && (
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Toi</span>
                )}
                {player.isAI && (
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">IA</span>
                )}
              </div>
              {showTeams && player.teamId && (
                <span className={`text-xs ${player.teamId === 'A' ? 'text-blue-500' : 'text-red-500'}`}>
                  Équipe {player.teamId}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showTeams && isHost && !player.isAI && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onAssignTeam?.(player.id, 'A')}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                      player.teamId === 'A'
                        ? 'bg-blue-100 text-blue-600'
                        : light ? 'bg-slate-100 text-slate-500 hover:bg-blue-50' : 'bg-bg-card text-slate-400 hover:bg-blue-500/20'
                    }`}
                  >A</button>
                  <button
                    onClick={() => onAssignTeam?.(player.id, 'B')}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                      player.teamId === 'B'
                        ? 'bg-red-100 text-red-600'
                        : light ? 'bg-slate-100 text-slate-500 hover:bg-red-50' : 'bg-bg-card text-slate-400 hover:bg-red-500/20'
                    }`}
                  >B</button>
                </div>
              )}

              {!player.isAI && (
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${player.isReady ? 'bg-emerald-400' : light ? 'bg-slate-300' : 'bg-slate-600'}`}
                  title={player.isReady ? 'Prêt' : 'Pas prêt'}
                />
              )}

              {isHost && player.id !== myPlayerId && !player.isAI && (
                <Button variant="ghost" size="sm" onClick={() => onKick?.(player.id)} className="text-red-400 hover:text-red-500 p-1">
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
