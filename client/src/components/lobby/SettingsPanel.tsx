import type { GameSettings, Genre, Decade } from '../../types/game'
import { GENRE_LABELS, GENRE_COLORS, DECADE_LABELS } from '../../types/game'

interface SettingsPanelProps {
  settings: GameSettings
  isHost: boolean
  onChange: (partial: Partial<GameSettings>) => void
}

const GENRES: Genre[] = ['pop', 'hiphop', 'electronic', 'rnb', 'french', 'latin']
const DECADES: Decade[] = ['2000s', '2010s', '2020s']

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

export function SettingsPanel({ settings, isHost, onChange }: SettingsPanelProps) {
  const disabled = !isHost

  return (
    <div className="space-y-6">
      {/* Genres */}
      <div>
        <label className="text-sm font-medium text-slate-400 block mb-3">Genres musicaux</label>
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
                  backgroundColor: active ? color + '30' : 'transparent',
                  borderColor: active ? color : '#2a2a3a',
                  color: active ? color : '#64748b',
                }}
              >
                {GENRE_LABELS[g]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Décennies */}
      <div>
        <label className="text-sm font-medium text-slate-400 block mb-3">Décennies</label>
        <div className="flex gap-2">
          {DECADES.map((d) => {
            const active = settings.decades.includes(d)
            return (
              <button
                key={d}
                disabled={disabled}
                onClick={() => onChange({ decades: toggle(settings.decades, d) })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                  disabled ? 'cursor-default' : 'cursor-pointer'
                } ${active
                  ? 'bg-primary/25 border-primary/50 text-primary-light'
                  : 'bg-transparent border-bg-border text-slate-500'
                }`}
              >
                {DECADE_LABELS[d]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mode de jeu */}
      <div>
        <label className="text-sm font-medium text-slate-400 block mb-3">Mode de jeu</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'classic', label: '🎵 Classique', desc: 'Devine titre ou artiste' },
            { value: 'buzzer', label: '🔔 Buzzer', desc: 'Premier à buzzer répond' },
            { value: 'teams', label: '👥 Équipes', desc: 'A vs B' },
            { value: 'soloVsAI', label: '🤖 Solo vs IA', desc: 'Affronte des robots' },
          ] as const).map(({ value, label, desc }) => (
            <button
              key={value}
              disabled={disabled}
              onClick={() => onChange({ mode: value })}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              } ${settings.mode === value
                ? 'bg-primary/20 border-primary/50'
                : 'bg-bg-surface border-bg-border hover:border-bg-border/60'
              }`}
            >
              <div className="font-semibold text-sm text-white">{label}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode de réponse */}
      <div>
        <label className="text-sm font-medium text-slate-400 block mb-3">Mode de réponse</label>
        <div className="flex gap-2">
          {([
            { value: 'text', label: '⌨️ Texte libre', desc: 'Tape ta réponse' },
            { value: 'multipleChoice', label: '🔘 Choix multiple', desc: '4 options' },
          ] as const).map(({ value, label, desc }) => (
            <button
              key={value}
              disabled={disabled}
              onClick={() => onChange({ answerMode: value })}
              className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              } ${settings.answerMode === value
                ? 'bg-primary/20 border-primary/50'
                : 'bg-bg-surface border-bg-border'
              }`}
            >
              <div className="text-sm font-semibold text-white">{label}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Rounds */}
      <div>
        <label className="text-sm font-medium text-slate-400 block mb-3">Nombre de rounds</label>
        <div className="flex gap-2">
          {[5, 10, 15, 20].map((n) => (
            <button
              key={n}
              disabled={disabled}
              onClick={() => onChange({ rounds: n })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              } ${settings.rounds === n
                ? 'bg-primary/25 border-primary/50 text-primary-light'
                : 'bg-transparent border-bg-border text-slate-500'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
