import type { GameSettings, Genre } from '../../types/game'
import { GENRE_LABELS, GENRE_COLORS } from '../../types/game'

interface SettingsPanelProps {
  settings: GameSettings
  isHost: boolean
  onChange: (partial: Partial<GameSettings>) => void
  light?: boolean
}

const GENRES: Genre[] = ['pop', 'hiphop', 'electronic', 'rnb', 'french', 'latin']

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

  return (
    <div className="space-y-6">
      {/* Genres */}
      <div>
        <label className={label}>Genres musicaux</label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => {
            const active = settings.genres.includes(g)
            const color = GENRE_COLORS[g]
            return (
              <button
                key={g}
                disabled={disabled}
                onClick={() => onChange({ genres: toggle(settings.genres, g) })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  disabled ? 'cursor-default' : 'cursor-pointer hover:opacity-90'
                }`}
                style={{
                  backgroundColor: active ? color + '20' : 'transparent',
                  borderColor: active ? color : light ? '#e2e8f0' : '#2a2a3a',
                  color: active ? color : light ? '#94a3b8' : '#64748b',
                }}
              >
                {GENRE_LABELS[g]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mode de jeu */}
      <div>
        <label className={label}>Mode de jeu</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'classic',   label: '🎵 Classique',  desc: 'Devine titre ou artiste' },
            { value: 'buzzer',    label: '🔔 Buzzer',     desc: 'Premier à buzzer répond' },
            { value: 'teams',     label: '👥 Équipes',    desc: 'A vs B' },
            { value: 'soloVsAI',  label: '🤖 Solo vs IA', desc: 'Affronte des robots' },
          ] as const).map(({ value, label: lbl, desc }) => (
            <button
              key={value}
              disabled={disabled}
              onClick={() => onChange({ mode: value, ...(value === 'buzzer' ? { answerMode: 'text' } : {}) })}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              } ${settings.mode === value ? activeBtn : inactiveBtn}`}
            >
              <div className={`font-semibold text-sm ${light ? 'text-slate-800' : 'text-white'}`}>{lbl}</div>
              <div className="text-xs text-slate-400">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode de réponse */}
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
              <button
                key={value}
                disabled={isDisabledOption}
                onClick={() => !isDisabledOption && onChange({ answerMode: value })}
                className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                  isDisabledOption ? 'cursor-default opacity-40' : 'cursor-pointer'
                } ${settings.answerMode === value ? activeBtn : inactiveBtn}`}
              >
                <div className={`text-sm font-semibold ${light ? 'text-slate-800' : 'text-white'}`}>{lbl}</div>
                <div className="text-xs text-slate-400">{desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Rounds */}
      <div>
        <label className={label}>Nombre de rounds</label>
        <div className="flex gap-2">
          {[5, 10, 15, 20].map((n) => (
            <button
              key={n}
              disabled={disabled}
              onClick={() => onChange({ rounds: n })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              } ${settings.rounds === n ? activeBtn : inactiveBtn}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
