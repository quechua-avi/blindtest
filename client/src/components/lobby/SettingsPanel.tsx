import { motion } from 'framer-motion'
import type { GameSettings, Genre } from '../../types/game'
import { GENRE_LABELS, GENRE_COLORS } from '../../types/game'

interface SettingsPanelProps {
  settings: GameSettings
  isHost: boolean
  onChange: (partial: Partial<GameSettings>) => void
  light?: boolean
}

const GENRES: Genre[] = ['chartsweekly', 'rapfr', 'jul', 'varfr', 'hits2000', 'hits2010', 'hits2020', 'electronic', 'latino']

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

export function SettingsPanel({ settings, isHost, onChange, light }: SettingsPanelProps) {
  const disabled = !isHost

  const label = light
    ? 'text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3'
    : 'text-sm font-medium text-slate-400 block mb-3'

  const inactiveBtn = light
    ? 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
    : 'bg-bg-surface border-bg-border text-slate-500 hover:border-bg-border/60'

  const activeBtn = 'bg-primary/10 border-primary/40 text-primary'

  const isStreamClash = settings.mode === 'streamclash'

  return (
    <div className="space-y-6">
      {/* StreamClash note */}
      {isStreamClash && (
        <div className={`rounded-xl px-4 py-3 text-sm ${light ? 'bg-violet-50 border border-violet-200 text-violet-700' : 'bg-primary/10 border border-primary/20 text-primary'}`}>
          <p className="font-semibold">⚡ Mode StreamClash</p>
          <p className="text-xs mt-0.5 opacity-80">Rap français · Catalogue de 43 titres · Données Spotify</p>
        </div>
      )}

      {/* Genres */}
      {!isStreamClash && (
        <div>
          <label className={label}>Genres musicaux</label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => {
              const active = settings.genres.includes(g)
              const color = GENRE_COLORS[g]
              return (
                <motion.button
                  key={g}
                  disabled={disabled}
                  onClick={() => onChange({ genres: toggle(settings.genres, g) })}
                  whileTap={disabled ? {} : { scale: 0.88 }}
                  whileHover={disabled ? {} : { scale: 1.06 }}
                  animate={active ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.2 }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-200 ${
                    disabled ? 'cursor-default' : 'cursor-pointer'
                  }`}
                  style={{
                    backgroundColor: active ? color + '20' : 'transparent',
                    borderColor: active ? color : light ? '#e2e8f0' : '#2a2a3a',
                    color: active ? color : light ? '#94a3b8' : '#64748b',
                  }}
                >
                  {GENRE_LABELS[g]}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Mode de jeu */}
      <div>
        <label className={label}>Mode de jeu</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            { value: 'classic',      label: '🎵 Classique',    desc: 'Devine titre ou artiste' },
            { value: 'buzzer',       label: '🔔 Buzzer',       desc: 'Premier à buzzer répond' },
            { value: 'teams',        label: '👥 Équipes',      desc: 'A vs B' },
            { value: 'saboteur',     label: '🕵️ Saboteur',    desc: "Trouve l'imposteur · 4j min" },
            { value: 'streamclash',  label: '⚡ StreamClash',  desc: 'Rap FR · Qui streame le plus ?' },
          ] as const).map(({ value, label: lbl, desc }) => (
            <motion.button
              key={value}
              disabled={disabled}
              onClick={() => onChange({ mode: value, ...(value === 'buzzer' ? { answerMode: 'text' } : {}) })}
              whileTap={disabled ? {} : { scale: 0.94 }}
              whileHover={disabled ? {} : { scale: 1.03 }}
              className={`p-3 rounded-xl border text-left transition-colors duration-200 ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              } ${settings.mode === value ? activeBtn : inactiveBtn}`}
            >
              <div className={`font-semibold text-sm ${light ? 'text-slate-800' : 'text-white'}`}>{lbl}</div>
              <div className="text-xs text-slate-400">{desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Mode de réponse */}
      {!isStreamClash && (
        <div>
          <label className={label}>Mode de réponse</label>
          <div className="flex gap-2">
            {([
              { value: 'text',           label: '⌨️ Texte libre',    desc: 'Tape ta réponse' },
              { value: 'multipleChoice', label: '🔘 Choix multiple', desc: '4 options' },
            ] as const).map(({ value, label: lbl, desc }) => {
              const isBuzzerMode = settings.mode === 'buzzer'
              const isDisabledOption = disabled || (isBuzzerMode && value === 'multipleChoice')
              return (
                <motion.button
                  key={value}
                  disabled={isDisabledOption}
                  onClick={() => !isDisabledOption && onChange({ answerMode: value })}
                  whileTap={isDisabledOption ? {} : { scale: 0.94 }}
                  whileHover={isDisabledOption ? {} : { scale: 1.03 }}
                  className={`flex-1 p-3 rounded-xl border text-left transition-colors ${
                    isDisabledOption ? 'cursor-default opacity-40' : 'cursor-pointer'
                  } ${settings.answerMode === value ? activeBtn : inactiveBtn}`}
                >
                  <div className={`text-sm font-semibold ${light ? 'text-slate-800' : 'text-white'}`}>{lbl}</div>
                  <div className="text-xs text-slate-400">{desc}</div>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Rounds */}
      <div>
        <label className={label}>Nombre de rounds</label>
        <div className="flex gap-2">
          {[5, 10, 15, 20].map((n) => (
            <motion.button
              key={n}
              disabled={disabled}
              onClick={() => onChange({ rounds: n })}
              whileTap={disabled ? {} : { scale: 0.90 }}
              whileHover={disabled ? {} : { scale: 1.06 }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              } ${settings.rounds === n ? activeBtn : inactiveBtn}`}
            >
              {n}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
