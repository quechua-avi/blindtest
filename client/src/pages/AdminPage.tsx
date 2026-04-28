import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GENRE_LABELS, GENRE_COLORS } from '../types/game'
import type { Genre, Decade } from '../types/game'

const ADMIN_SECRET_KEY = 'admin_secret'

interface AdminSong {
  id: string
  title: string
  artist: string
  year: number
  genre: Genre
  decade: Decade
  alternativeTitles?: string[]
  alternativeArtists?: string[]
  deezerWebUrl: string
  deezerSearchUrl: string
}

interface ChartSong {
  id: string
  title: string
  artist: string
  year: number
  preview_url: string
  cover_url: string | null
  position: number | null
  source: string
}

interface SyncInfo {
  source: string
  label: string
  syncedAt: number | null
  count: number
  status: string
}

interface EnrichmentStatus {
  total: number
  cached: number
  missing: number
  pending: number
}

interface AdminRoom {
  code: string
  status: string
  players: Array<{ id: string; name: string; avatarColor: string; isHost: boolean }>
  settings: { mode: string; genres: string[]; rounds: number; answerMode: string }
  currentRound: number
  totalRounds: number
}

interface AdminUser {
  id: number
  email: string
  username: string
  avatar_color: string
  created_at: number
  last_login: number | null
  games_played: number
  games_won: number
  total_score: number
  best_score: number
  correct_answers: number
  best_streak: number
}

const GENRE_ORDER: Genre[] = ['chartsweekly', 'rapfr', 'jul', 'varfr', 'hits2000', 'hits2010', 'hits2020', 'electronic', 'latino']
const DECADE_ORDER: Decade[] = ['2000s', '2010s', '2020s']

export function AdminPage() {
  const navigate = useNavigate()
  const [secret, setSecret] = useState(() => sessionStorage.getItem(ADMIN_SECRET_KEY) ?? '')
  const [input, setInput] = useState('')
  const [songs, setSongs] = useState<AdminSong[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'songs' | 'users' | 'settings' | 'rooms' | 'charts'>('songs')
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [chartSongs, setChartSongs] = useState<ChartSong[]>([])
  const [chartSyncInfos, setChartSyncInfos] = useState<SyncInfo[]>([])
  const [chartSyncing, setChartSyncing] = useState(false)
  const [enrichment, setEnrichment] = useState<EnrichmentStatus | null>(null)
  const [enrichmentRunning, setEnrichmentRunning] = useState(false)
  const [requireRoomPassword, setRequireRoomPassword] = useState(true)
  const [roomPassword, setRoomPassword]               = useState('')
  const [settingsSaved, setSettingsSaved]             = useState(false)
  const [settingsLoading, setSettingsLoading]         = useState(false)
  const [filterGenre, setFilterGenre] = useState<Genre | 'all'>('all')
  const [filterDecade, setFilterDecade] = useState<Decade | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'genre' | 'title' | 'artist' | 'year'>('genre')

  const isAuthed = !!secret && songs.length > 0

  useEffect(() => {
    if (secret) fetchAll(secret)
  }, [])

  async function fetchAll(s: string) {
    setLoading(true)
    setError('')
    try {
      const [songsRes, usersRes, settingsRes, roomsRes] = await Promise.all([
        fetch(`/api/admin/songs?secret=${encodeURIComponent(s)}`),
        fetch(`/api/admin/users?secret=${encodeURIComponent(s)}`),
        fetch(`/api/admin/settings?secret=${encodeURIComponent(s)}`),
        fetch(`/api/admin/rooms?secret=${encodeURIComponent(s)}`),
      ])
      if (songsRes.status === 401) {
        setError('Mot de passe incorrect')
        sessionStorage.removeItem(ADMIN_SECRET_KEY)
        setSecret('')
        return
      }
      const enrichmentRes = await fetch(`/api/admin/enrichment?secret=${encodeURIComponent(s)}`)
      const [songsData, usersData, settingsData, roomsData, enrichmentData] = await Promise.all([songsRes.json(), usersRes.json(), settingsRes.json(), roomsRes.json(), enrichmentRes.json()])
      setSongs(songsData.songs)
      setUsers(usersData.users ?? [])
      setRooms(roomsData.rooms ?? [])
      setEnrichment(enrichmentData)
      setRequireRoomPassword(settingsData.requireRoomPassword ?? true)
      setRoomPassword(settingsData.roomPassword ?? '')
      sessionStorage.setItem(ADMIN_SECRET_KEY, s)
      setSecret(s)
    } catch {
      setError('Impossible de joindre le serveur')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSettingsLoading(true)
    setSettingsSaved(false)
    try {
      const res = await fetch(`/api/admin/settings?secret=${encodeURIComponent(secret)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requireRoomPassword, roomPassword }),
      })
      if (res.ok) {
        const data = await res.json()
        setRequireRoomPassword(data.requireRoomPassword)
        setRoomPassword(data.roomPassword)
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 2500)
      }
    } catch {}
    setSettingsLoading(false)
  }

  const filtered = useMemo(() => {
    let list = songs
    if (filterGenre !== 'all') list = list.filter((s) => s.genre === filterGenre)
    if (filterDecade !== 'all') list = list.filter((s) => s.decade === filterDecade)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'genre') {
        const gi = GENRE_ORDER.indexOf(a.genre) - GENRE_ORDER.indexOf(b.genre)
        if (gi !== 0) return gi
        const di = DECADE_ORDER.indexOf(a.decade) - DECADE_ORDER.indexOf(b.decade)
        if (di !== 0) return di
        return a.title.localeCompare(b.title)
      }
      if (sortBy === 'year') return a.year - b.year
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      return a.artist.localeCompare(b.artist)
    })
  }, [songs, filterGenre, filterDecade, search, sortBy])

  const fetchCharts = async () => {
    try {
      const res = await fetch(`/api/admin/charts?secret=${encodeURIComponent(secret)}`)
      if (!res.ok) return
      const data = await res.json()
      setChartSongs(data.songs ?? [])
      setChartSyncInfos(data.syncInfos ?? [])
    } catch {}
  }

  const triggerSync = async (source: string) => {
    setChartSyncing(true)
    try {
      await fetch(`/api/admin/charts/sync?secret=${encodeURIComponent(secret)}&source=${encodeURIComponent(source)}`, { method: 'POST' })
      await fetchCharts()
    } catch {}
    setChartSyncing(false)
  }

  const runEnrichment = async () => {
    setEnrichmentRunning(true)
    try {
      await fetch(`/api/admin/enrichment/run?secret=${encodeURIComponent(secret)}`, { method: 'POST' })
      // Poll status every 5s for 60s
      let attempts = 0
      const poll = setInterval(async () => {
        const res = await fetch(`/api/admin/enrichment?secret=${encodeURIComponent(secret)}`)
        const data: EnrichmentStatus = await res.json()
        setEnrichment(data)
        if (data.pending === 0 || ++attempts >= 12) {
          clearInterval(poll)
          setEnrichmentRunning(false)
        }
      }, 5000)
    } catch {
      setEnrichmentRunning(false)
    }
  }

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`Supprimer le compte de "${username}" ? Cette action est irréversible.`)) return
    try {
      const res = await fetch(`/api/admin/users/${userId}?secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
      if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch {}
  }

  const stats = useMemo(() => {
    const byGenre: Record<string, number> = {}
    const byDecade: Record<string, number> = {}
    for (const s of songs) {
      byGenre[s.genre] = (byGenre[s.genre] ?? 0) + 1
      byDecade[s.decade] = (byDecade[s.decade] ?? 0) + 1
    }
    return { byGenre, byDecade }
  }, [songs])

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 w-full max-w-sm space-y-4"
        >
          <div className="text-center space-y-1">
            <div className="text-3xl mb-2">🎵</div>
            <h1 className="text-2xl font-bold text-slate-800">Blindtest Admin</h1>
            <p className="text-slate-400 text-sm">Accès restreint</p>
          </div>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAll(input)}
            placeholder="Mot de passe..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <motion.button
            onClick={() => fetchAll(input)}
            disabled={loading || !input}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold disabled:opacity-40 cursor-pointer hover:bg-violet-700 transition-colors"
          >
            {loading ? 'Connexion...' : 'Accéder'}
          </motion.button>
          <button
            onClick={() => navigate('/')}
            className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            ← Retour à l'accueil
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mr-1 text-lg"
            title="Retour à l'accueil"
          >
            ←
          </button>
          <span className="text-xl">🎵</span>
          <div>
            <h1 className="text-lg font-bold text-slate-800">BeatBlind Admin</h1>
            <p className="text-slate-400 text-xs">{songs.length} chansons · {users.length} utilisateurs</p>
          </div>
        </div>
        <motion.button
          onClick={() => { sessionStorage.removeItem(ADMIN_SECRET_KEY); setSongs([]); setSecret('') }}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer transition-colors"
        >
          Déconnexion
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-1">
          {(['songs', 'users', 'rooms', 'charts', 'settings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                if (t === 'rooms') {
                  fetch(`/api/admin/rooms?secret=${encodeURIComponent(secret)}`).then(r => r.json()).then(d => setRooms(d.rooms ?? [])).catch(() => {})
                }
                if (t === 'charts') fetchCharts()
              }}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                tab === t
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'songs' ? `Chansons (${songs.length})`
                : t === 'users' ? `Utilisateurs (${users.length})`
                : t === 'rooms' ? `Salles (${rooms.length})`
                : t === 'charts' ? `Charts (${chartSongs.length})`
                : 'Paramètres'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {tab === 'charts' && (
          <div className="space-y-5">
            {/* En-tête */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800">Charts Deezer</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Synchronisation automatique chaque semaine · Chansons utilisées quand le genre "Top France" est sélectionné
                </p>
              </div>
              <button
                onClick={fetchCharts}
                className="text-xs text-violet-600 border border-violet-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-violet-50 transition-colors"
              >
                ↻ Actualiser
              </button>
            </div>

            {/* Sources + statuts de sync */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {chartSyncInfos.length === 0 ? (
                <div className="col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center text-slate-400 text-sm">
                  Aucune source configurée — cliquez sur "Synchroniser" pour lancer la première sync.
                </div>
              ) : chartSyncInfos.map((info) => {
                const lastDate = info.syncedAt
                  ? new Date(info.syncedAt * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : null
                const isOk = info.status === 'ok' || info.status === 'never'
                return (
                  <div key={info.source} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{info.label}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{info.source}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        info.status === 'ok' ? 'bg-emerald-100 text-emerald-700'
                          : info.status === 'never' ? 'bg-slate-100 text-slate-500'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {info.status === 'ok' ? '✓ OK' : info.status === 'never' ? 'Jamais sync' : '⚠ Erreur'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>
                        <span className="font-semibold">{info.count}</span> chansons
                        {lastDate && <> · Dernière sync : <span className="font-semibold">{lastDate}</span></>}
                      </p>
                      {!isOk && <p className="text-red-500 truncate">{info.status}</p>}
                    </div>
                    <motion.button
                      onClick={() => triggerSync(info.source)}
                      disabled={chartSyncing}
                      whileTap={{ scale: 0.95 }}
                      className="w-full py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-violet-700 transition-colors cursor-pointer"
                    >
                      {chartSyncing ? 'Synchronisation...' : '⚡ Synchroniser maintenant'}
                    </motion.button>
                  </div>
                )
              })}

              {/* Carte "Première sync" si aucune info */}
              {chartSyncInfos.length === 0 && (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-center">
                  <p className="text-slate-400 text-sm">Aucune playlist synchronisée</p>
                  <motion.button
                    onClick={() => triggerSync('chartsweekly')}
                    disabled={chartSyncing}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    {chartSyncing ? 'Sync...' : 'Première sync'}
                  </motion.button>
                </div>
              )}
            </div>

            {/* Liste des chansons */}
            {chartSongs.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">{chartSongs.length} chansons actuelles</p>
                  <p className="text-xs text-slate-400">Les previews viennent directement de Deezer — temps de chargement quasi nul</p>
                </div>
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {chartSongs.map((song) => (
                    <div key={song.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                      {/* Position */}
                      <span className="text-xs font-bold text-slate-300 w-6 text-right flex-shrink-0">
                        {song.position ?? '—'}
                      </span>
                      {/* Pochette */}
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                        {song.cover_url
                          ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">♪</div>
                        }
                      </div>
                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{song.title}</p>
                        <p className="text-xs text-slate-400 truncate">{song.artist} · {song.year}</p>
                      </div>
                      {/* Preview player */}
                      <audio
                        controls
                        src={song.preview_url}
                        preload="none"
                        className="h-7 w-32 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chartSongs.length === 0 && chartSyncInfos.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center text-slate-400 text-sm">
                Aucune chanson en DB — synchronisez une source pour commencer.
              </div>
            )}
          </div>
        )}

        {tab === 'rooms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Salles actives ({rooms.length})</h2>
              <button
                onClick={() => fetch(`/api/admin/rooms?secret=${encodeURIComponent(secret)}`).then(r => r.json()).then(d => setRooms(d.rooms ?? [])).catch(() => {})}
                className="text-xs text-violet-600 border border-violet-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-violet-50 transition-colors"
              >
                ↻ Actualiser
              </button>
            </div>
            {rooms.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center text-slate-400 text-sm">
                Aucune salle active
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rooms.map((room) => {
                  const STATUS_LABELS: Record<string, string> = { lobby: 'Lobby', playing: 'En jeu', paused: 'En pause', ended: 'Terminée' }
                  const STATUS_COLORS: Record<string, string> = { lobby: 'bg-slate-100 text-slate-500', playing: 'bg-emerald-100 text-emerald-700', paused: 'bg-amber-100 text-amber-700', ended: 'bg-red-100 text-red-600' }
                  const MODE_LABELS: Record<string, string> = { classic: '🎵 Classique', buzzer: '🔔 Buzzer', teams: '👥 Équipes', saboteur: '🕵️ Saboteur', streamclash: '⚡ StreamClash' }
                  return (
                    <div key={room.code} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display font-bold text-slate-900 text-xl tracking-widest">{room.code}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{MODE_LABELS[room.settings.mode] ?? room.settings.mode}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[room.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_LABELS[room.status] ?? room.status}
                        </span>
                      </div>

                      {room.status === 'playing' && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Round {room.currentRound}/{room.totalRounds}
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Joueurs ({room.players.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {room.players.map((p) => (
                            <div key={p.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                                style={{ backgroundColor: p.avatarColor }}
                              >
                                {p.name[0]?.toUpperCase()}
                              </div>
                              <span className="text-xs text-slate-700 font-medium">
                                {p.name}{p.isHost ? ' 👑' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-lg space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Création de parties</h2>
              <p className="text-slate-400 text-sm">Contrôle qui peut créer une nouvelle salle.</p>
            </div>

            {/* Toggle mot de passe requis */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Mot de passe requis</p>
                <p className="text-xs text-slate-400 mt-0.5">Si activé, les joueurs doivent entrer un mot de passe pour créer une partie.</p>
              </div>
              <button
                onClick={() => setRequireRoomPassword((v) => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  requireRoomPassword ? 'bg-violet-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    requireRoomPassword ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Champ mot de passe */}
            {requireRoomPassword && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mot de passe actuel</label>
                <input
                  type="text"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  placeholder="Minimum 4 caractères"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-sm font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">Partagez ce mot de passe uniquement avec les hôtes autorisés.</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <motion.button
                onClick={saveSettings}
                disabled={settingsLoading || (requireRoomPassword && roomPassword.trim().length < 4)}
                whileTap={{ scale: 0.95 }}
                className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-violet-700 transition-colors cursor-pointer"
              >
                {settingsLoading ? 'Enregistrement...' : 'Enregistrer'}
              </motion.button>
              {settingsSaved && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-green-600 font-semibold"
                >
                  ✓ Sauvegardé
                </motion.span>
              )}
            </div>
          </div>
        )}
        {tab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Utilisateur</th>
                    <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Email</th>
                    <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Parties</th>
                    <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Victoires</th>
                    <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Score total</th>
                    <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Meilleur score</th>
                    <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Série max</th>
                    <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Inscrit le</th>
                    <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: u.avatar_color }}
                          >
                            {u.username[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.email}</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{u.games_played ?? 0}</td>
                      <td className="px-4 py-3 text-slate-700">{u.games_won ?? 0}</td>
                      <td className="px-4 py-3 text-slate-700">{(u.total_score ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{(u.best_score ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{u.best_streak ?? 0}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date((u.created_at ?? 0) * 1000).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <motion.button
                          onClick={() => deleteUser(u.id, u.username)}
                          whileTap={{ scale: 0.9 }}
                          className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                        >
                          Supprimer
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={9} className="text-center text-slate-400 py-12">Aucun utilisateur inscrit</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === 'songs' && (
        <>
        {/* Enrichissement Deezer */}
        {enrichment && (
          <div className={`rounded-2xl border p-4 flex flex-wrap items-center gap-4 shadow-sm ${
            enrichment.pending > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${enrichment.pending > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                Previews Deezer — bibliothèque statique
              </p>
              <p className="text-xs mt-0.5 text-slate-500">
                <span className="font-semibold text-emerald-700">{enrichment.cached}</span> avec preview ·{' '}
                <span className="font-semibold text-slate-500">{enrichment.missing}</span> introuvables ·{' '}
                <span className={`font-semibold ${enrichment.pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {enrichment.pending} en attente
                </span>{' '}
                / {enrichment.total} total
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((enrichment.cached / enrichment.total) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-600">
                {Math.round((enrichment.cached / enrichment.total) * 100)}%
              </span>
              {enrichment.pending > 0 && (
                <motion.button
                  onClick={runEnrichment}
                  disabled={enrichmentRunning}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  {enrichmentRunning ? 'En cours...' : '▶ Lancer'}
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {GENRE_ORDER.map((g) => (
            <div
              key={g}
              className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm"
              style={{ borderLeftColor: GENRE_COLORS[g], borderLeftWidth: 3 }}
            >
              <span className="text-sm text-slate-600">{GENRE_LABELS[g]}</span>
              <span className="text-lg font-bold" style={{ color: GENRE_COLORS[g] }}>
                {stats.byGenre[g] ?? 0}
              </span>
            </div>
          ))}
          {DECADE_ORDER.map((d) => (
            <div key={d} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
              <span className="text-sm text-slate-600">{d}</span>
              <span className="text-lg font-bold text-slate-700">{stats.byDecade[d] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher titre, artiste, ID..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-sm"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Genre :</span>
            {(['all', ...GENRE_ORDER] as const).map((g) => (
              <motion.button
                key={g}
                onClick={() => setFilterGenre(g)}
                whileTap={{ scale: 0.9 }}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
                style={
                  filterGenre === g && g !== 'all'
                    ? { borderColor: GENRE_COLORS[g], color: GENRE_COLORS[g], backgroundColor: GENRE_COLORS[g] + '15' }
                    : filterGenre === g
                    ? { borderColor: '#7c3aed', color: '#7c3aed', backgroundColor: '#ede9fe' }
                    : { borderColor: '#e2e8f0', color: '#94a3b8', backgroundColor: 'transparent' }
                }
              >
                {g === 'all' ? 'Tous' : GENRE_LABELS[g]}
              </motion.button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Décennie :</span>
            {(['all', ...DECADE_ORDER] as const).map((d) => (
              <motion.button
                key={d}
                onClick={() => setFilterDecade(d)}
                whileTap={{ scale: 0.9 }}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
                style={
                  filterDecade === d
                    ? { borderColor: '#7c3aed', color: '#7c3aed', backgroundColor: '#ede9fe' }
                    : { borderColor: '#e2e8f0', color: '#94a3b8', backgroundColor: 'transparent' }
                }
              >
                {d === 'all' ? 'Toutes' : d}
              </motion.button>
            ))}
            <span className="ml-auto text-xs text-slate-400 uppercase tracking-wider font-semibold">Trier :</span>
            {(['genre', 'title', 'artist', 'year'] as const).map((s) => (
              <motion.button
                key={s}
                onClick={() => setSortBy(s)}
                whileTap={{ scale: 0.9 }}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
                style={
                  sortBy === s
                    ? { borderColor: '#7c3aed', color: '#7c3aed', backgroundColor: '#ede9fe' }
                    : { borderColor: '#e2e8f0', color: '#94a3b8', backgroundColor: 'transparent' }
                }
              >
                {s === 'genre' ? 'Genre' : s === 'title' ? 'Titre' : s === 'artist' ? 'Artiste' : 'Année'}
              </motion.button>
            ))}
          </div>
          <p className="text-xs text-slate-400">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold w-8">#</th>
                  <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Titre</th>
                  <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Artiste</th>
                  <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Année</th>
                  <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Genre</th>
                  <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Décennie</th>
                  <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">ID</th>
                  <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Deezer</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filtered.map((song, i) => (
                    <motion.tr
                      key={song.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(i * 0.008, 0.25) }}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-300 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {song.title}
                        {song.alternativeTitles && song.alternativeTitles.length > 0 && (
                          <div className="text-xs text-slate-400 mt-0.5">{song.alternativeTitles.join(', ')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {song.artist}
                        {song.alternativeArtists && song.alternativeArtists.length > 0 && (
                          <div className="text-xs text-slate-400 mt-0.5">{song.alternativeArtists.join(', ')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{song.year}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: GENRE_COLORS[song.genre] + '18', color: GENRE_COLORS[song.genre] }}
                        >
                          {GENRE_LABELS[song.genre]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{song.decade}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{song.id}</code>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={song.deezerWebUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-violet-600 hover:text-violet-800 hover:underline font-medium"
                        >
                          Deezer ↗
                        </a>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 py-12">Aucune chanson trouvée</p>
            )}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  )
}
