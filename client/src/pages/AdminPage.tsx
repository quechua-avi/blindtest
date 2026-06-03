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

interface CustomPlaylist {
  id: string
  label: string
  url: string
  color: string
  emoji: string
  createdAt: number
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

function relativeTime(ts: number | null): string {
  if (!ts) return 'Jamais'
  const diff = Date.now() - ts * 1000
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days}j`
  if (days < 30) return `Il y a ${Math.floor(days / 7)}sem`
  return new Date(ts * 1000).toLocaleDateString('fr-FR')
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${value ? 'bg-primary' : 'bg-slate-200'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

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
  const [rankPatching, setRankPatching] = useState(false)
  const [rankPatchResult, setRankPatchResult] = useState<{ updated: number; errors: number } | null>(null)

  // Settings
  const [requireRoomPassword, setRequireRoomPassword] = useState(true)
  const [roomPassword, setRoomPassword] = useState('')
  const [defaultRounds, setDefaultRounds] = useState(10)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('Le serveur est temporairement en maintenance. Réessayez dans quelques minutes.')
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // Charts / playlists
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([])
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('')
  const [newPlaylistLabel, setNewPlaylistLabel] = useState('')
  const [newPlaylistColor, setNewPlaylistColor] = useState('#f97316')
  const [newPlaylistEmoji, setNewPlaylistEmoji] = useState('🎵')
  const [playlistSaving, setPlaylistSaving] = useState(false)
  const [playlistError, setPlaylistError] = useState('')

  // Filters
  const [filterGenre, setFilterGenre] = useState<Genre | 'all'>('all')
  const [filterDecade, setFilterDecade] = useState<Decade | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'genre' | 'title' | 'artist' | 'year'>('genre')
  const [userSearch, setUserSearch] = useState('')

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
      const [songsData, usersData, settingsData, roomsData, enrichmentData] = await Promise.all([
        songsRes.json(), usersRes.json(), settingsRes.json(), roomsRes.json(), enrichmentRes.json(),
      ])
      setSongs(songsData.songs)
      setUsers(usersData.users ?? [])
      setRooms(roomsData.rooms ?? [])
      setEnrichment(enrichmentData)
      setRequireRoomPassword(settingsData.requireRoomPassword ?? true)
      setRoomPassword(settingsData.roomPassword ?? '')
      setDefaultRounds(settingsData.defaultRounds ?? 10)
      setMaintenanceMode(settingsData.maintenanceMode ?? false)
      setMaintenanceMessage(settingsData.maintenanceMessage ?? 'Le serveur est temporairement en maintenance. Réessayez dans quelques minutes.')
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
        body: JSON.stringify({ requireRoomPassword, roomPassword, defaultRounds, maintenanceMode, maintenanceMessage }),
      })
      if (res.ok) {
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

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users
    const q = userSearch.toLowerCase()
    return users.filter((u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, userSearch])

  const fetchCharts = async () => {
    try {
      const [chartsRes, playlistsRes] = await Promise.all([
        fetch(`/api/admin/charts?secret=${encodeURIComponent(secret)}`),
        fetch(`/api/admin/playlists?secret=${encodeURIComponent(secret)}`),
      ])
      if (chartsRes.ok) {
        const data = await chartsRes.json()
        setChartSongs(data.songs ?? [])
        setChartSyncInfos(data.syncInfos ?? [])
      }
      if (playlistsRes.ok) {
        const data = await playlistsRes.json()
        setCustomPlaylists(data ?? [])
      }
    } catch {}
  }

  const addPlaylist = async () => {
    if (!newPlaylistUrl.trim() || !newPlaylistLabel.trim()) return
    setPlaylistSaving(true)
    setPlaylistError('')
    try {
      const res = await fetch(`/api/admin/playlists?secret=${encodeURIComponent(secret)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newPlaylistUrl.trim(), label: newPlaylistLabel.trim(), color: newPlaylistColor, emoji: newPlaylistEmoji }),
      })
      const data = await res.json()
      if (!res.ok) { setPlaylistError(data.error ?? 'Erreur'); return }
      setNewPlaylistUrl('')
      setNewPlaylistLabel('')
      await fetchCharts()
    } catch { setPlaylistError('Impossible de joindre le serveur') }
    finally { setPlaylistSaving(false) }
  }

  const deletePlaylist = async (id: string, label: string) => {
    if (!confirm(`Supprimer la playlist "${label}" et ses ${chartSyncInfos.find((i) => i.source === id)?.count ?? 0} chansons ?`)) return
    try {
      await fetch(`/api/admin/playlists/${id}?secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
      await fetchCharts()
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

  const patchRank = async () => {
    setRankPatching(true)
    setRankPatchResult(null)
    try {
      const res = await fetch(`/api/admin/enrichment/patch-rank?secret=${encodeURIComponent(secret)}`, { method: 'POST' })
      const data = await res.json()
      setRankPatchResult({ updated: data.updated ?? 0, errors: data.errors ?? 0 })
    } catch {}
    setRankPatching(false)
  }

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`Supprimer le compte de "${username}" ? Cette action est irréversible.`)) return
    try {
      const res = await fetch(`/api/admin/users/${userId}?secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
      if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch {}
  }

  const logout = () => {
    sessionStorage.removeItem(ADMIN_SECRET_KEY)
    setSongs([])
    setSecret('')
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

  // ── Login ────────────────────────────────────────────────────────
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
            <h1 className="text-2xl font-bold text-slate-800">BeatBlind Admin</h1>
            <p className="text-slate-400 text-sm">Accès restreint</p>
          </div>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAll(input)}
            placeholder="Mot de passe..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <motion.button
            onClick={() => fetchAll(input)}
            disabled={loading || !input}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-40 cursor-pointer hover:bg-orange-600 transition-colors"
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

  const liveRooms = rooms.filter((r) => r.status === 'playing').length
  const TABS: Array<{ id: typeof tab; label: string; icon: string; count: number; live: boolean }> = [
    { id: 'songs',    label: 'Chansons',     icon: '🎵', count: songs.length,       live: false },
    { id: 'users',    label: 'Utilisateurs', icon: '👥', count: users.length,       live: false },
    { id: 'rooms',    label: 'Salles',       icon: '🏠', count: rooms.length,       live: liveRooms > 0 },
    { id: 'charts',   label: 'Charts',       icon: '📊', count: chartSongs.length,  live: false },
    { id: 'settings', label: 'Paramètres',  icon: '⚙️', count: 0,                  live: false },
  ]

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-lg"
            title="Retour à l'accueil"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎵</span>
            <h1 className="text-lg font-bold text-slate-800">BeatBlind Admin</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{songs.length} chansons</span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{users.length} utilisateurs</span>
            {liveRooms > 0 && (
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {liveRooms} partie{liveRooms > 1 ? 's' : ''} en cours
              </span>
            )}
            {maintenanceMode && (
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">⚠ Maintenance</span>
            )}
          </div>
        </div>
        <motion.button
          onClick={logout}
          whileTap={{ scale: 0.95 }}
          className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer transition-colors"
        >
          Déconnexion
        </motion.button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(({ id, label, icon, count, live }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id)
                if (id === 'rooms') fetch(`/api/admin/rooms?secret=${encodeURIComponent(secret)}`).then((r) => r.json()).then((d) => setRooms(d.rooms ?? [])).catch(() => {})
                if (id === 'charts') fetchCharts()
              }}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                tab === id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {count !== undefined && count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  live ? 'bg-emerald-100 text-emerald-700' : tab === id ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* ══ SONGS ═══════════════════════════════════════════════════ */}
        {tab === 'songs' && (
          <>
            {/* Outils Deezer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrichment && (
                <div className={`rounded-2xl border p-4 shadow-sm ${enrichment.pending > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className={`text-sm font-bold ${enrichment.pending > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                        Previews Deezer — bibliothèque statique
                      </p>
                      <p className="text-xs mt-0.5 text-slate-500">
                        <span className="font-semibold text-emerald-700">{enrichment.cached}</span> avec preview ·{' '}
                        <span className="font-semibold text-slate-500">{enrichment.missing}</span> introuvables ·{' '}
                        <span className={`font-semibold ${enrichment.pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{enrichment.pending} en attente</span>
                      </p>
                    </div>
                    {enrichment.pending > 0 && (
                      <motion.button
                        onClick={runEnrichment}
                        disabled={enrichmentRunning}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-amber-700 transition-colors cursor-pointer flex-shrink-0"
                      >
                        {enrichmentRunning ? 'En cours...' : '▶ Lancer'}
                      </motion.button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((enrichment.cached / enrichment.total) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 flex-shrink-0">
                      {Math.round((enrichment.cached / enrichment.total) * 100)}%
                    </span>
                  </div>
                </div>
              )}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Popularité Deezer (rank)</p>
                    <p className="text-xs mt-0.5 text-slate-500">
                      Score de popularité pour les chansons affichant 0. Utilisé dans StreamClash.
                    </p>
                    {rankPatchResult && (
                      <p className="text-xs mt-1.5 text-emerald-700 font-semibold">
                        ✓ {rankPatchResult.updated} mises à jour · {rankPatchResult.errors} erreurs
                      </p>
                    )}
                  </div>
                  <motion.button
                    onClick={patchRank}
                    disabled={rankPatching}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-orange-600 transition-colors cursor-pointer flex-shrink-0"
                  >
                    {rankPatching ? 'En cours...' : '🏆 Patch rank'}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Stats genres — cliquables pour filtrer */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Répartition par genre</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                {GENRE_ORDER.map((g) => {
                  const count = stats.byGenre[g] ?? 0
                  const pct = songs.length > 0 ? Math.round((count / songs.length) * 100) : 0
                  const isActive = filterGenre === g
                  return (
                    <button
                      key={g}
                      onClick={() => { setFilterGenre(isActive ? 'all' : g) }}
                      className={`bg-white border rounded-xl p-3 text-center shadow-sm cursor-pointer hover:border-primary/40 transition-all ${isActive ? 'ring-2 ring-primary/30' : ''}`}
                      style={{ borderTopColor: GENRE_COLORS[g], borderTopWidth: 3, borderColor: isActive ? GENRE_COLORS[g] : undefined }}
                    >
                      <p className="text-lg font-bold" style={{ color: GENRE_COLORS[g] }}>{count}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-tight truncate" title={GENRE_LABELS[g]}>{GENRE_LABELS[g]}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{pct}%</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filtres */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher titre, artiste, ID..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-sm"
                />
                {(search || filterGenre !== 'all' || filterDecade !== 'all') && (
                  <button
                    onClick={() => { setSearch(''); setFilterGenre('all'); setFilterDecade('all') }}
                    className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mr-1">Genre :</span>
                {(['all', ...GENRE_ORDER] as const).map((g) => (
                  <motion.button
                    key={g}
                    onClick={() => setFilterGenre(g)}
                    whileTap={{ scale: 0.9 }}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
                    style={
                      filterGenre === g && g !== 'all'
                        ? { borderColor: GENRE_COLORS[g], color: GENRE_COLORS[g], backgroundColor: GENRE_COLORS[g] + '15' }
                        : filterGenre === g
                        ? { borderColor: '#f97316', color: '#f97316', backgroundColor: '#fff7ed' }
                        : { borderColor: '#e2e8f0', color: '#94a3b8', backgroundColor: 'transparent' }
                    }
                  >
                    {g === 'all' ? 'Tous' : GENRE_LABELS[g]}
                  </motion.button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mr-1">Décennie :</span>
                {(['all', ...DECADE_ORDER] as const).map((d) => (
                  <motion.button
                    key={d}
                    onClick={() => setFilterDecade(d)}
                    whileTap={{ scale: 0.9 }}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
                    style={
                      filterDecade === d
                        ? { borderColor: '#f97316', color: '#f97316', backgroundColor: '#fff7ed' }
                        : { borderColor: '#e2e8f0', color: '#94a3b8', backgroundColor: 'transparent' }
                    }
                  >
                    {d === 'all' ? 'Toutes' : d}
                  </motion.button>
                ))}
                <span className="ml-auto text-xs text-slate-400 uppercase tracking-wider font-semibold mr-1">Trier :</span>
                {(['genre', 'title', 'artist', 'year'] as const).map((s) => (
                  <motion.button
                    key={s}
                    onClick={() => setSortBy(s)}
                    whileTap={{ scale: 0.9 }}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
                    style={
                      sortBy === s
                        ? { borderColor: '#f97316', color: '#f97316', backgroundColor: '#fff7ed' }
                        : { borderColor: '#e2e8f0', color: '#94a3b8', backgroundColor: 'transparent' }
                    }
                  >
                    {s === 'genre' ? 'Genre' : s === 'title' ? 'Titre' : s === 'artist' ? 'Artiste' : 'Année'}
                  </motion.button>
                ))}
              </div>
              <p className="text-xs text-slate-400">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {songs.length}</p>
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
                              className="text-xs text-primary hover:text-orange-700 hover:underline font-medium"
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

        {/* ══ USERS ═══════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Rechercher un utilisateur ou email..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-sm shadow-sm"
              />
              <span className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-slate-600 flex-shrink-0">
                {filteredUsers.length} / {users.length} utilisateurs
              </span>
            </div>
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
                      <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Dernière co.</th>
                      <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: u.avatar_color }}
                            >
                              {u.username[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{u.username}</p>
                              <p className="text-xs text-slate-400">{new Date((u.created_at ?? 0) * 1000).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                        <td className="px-4 py-3 text-slate-700 font-semibold">{u.games_played ?? 0}</td>
                        <td className="px-4 py-3 text-slate-700">{u.games_won ?? 0}</td>
                        <td className="px-4 py-3 text-slate-700">{(u.total_score ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-700">{(u.best_score ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          {u.best_streak > 0
                            ? <span className="inline-flex items-center gap-1 text-orange-600 font-bold text-xs">🔥 {u.best_streak}</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{relativeTime(u.last_login)}</td>
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
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={9} className="text-center text-slate-400 py-12">Aucun utilisateur trouvé</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ ROOMS ═══════════════════════════════════════════════════ */}
        {tab === 'rooms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Salles actives</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {rooms.length} salle{rooms.length !== 1 ? 's' : ''} en mémoire
                  {liveRooms > 0 && ` · ${liveRooms} en jeu`}
                </p>
              </div>
              <button
                onClick={() => fetch(`/api/admin/rooms?secret=${encodeURIComponent(secret)}`).then((r) => r.json()).then((d) => setRooms(d.rooms ?? [])).catch(() => {})}
                className="text-xs text-primary border border-primary/20 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-primary/5 transition-colors"
              >
                ↻ Actualiser
              </button>
            </div>
            {rooms.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center">
                <p className="text-4xl mb-3">🏠</p>
                <p className="text-slate-600 font-semibold">Aucune salle active</p>
                <p className="text-slate-400 text-sm mt-1">Les salles apparaissent dès que des joueurs se connectent.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rooms.map((room) => {
                  const STATUS_LABELS: Record<string, string> = { lobby: 'Lobby', playing: 'En jeu', paused: 'En pause', ended: 'Terminée' }
                  const STATUS_COLORS: Record<string, string> = { lobby: 'bg-slate-100 text-slate-500', playing: 'bg-emerald-100 text-emerald-700', paused: 'bg-amber-100 text-amber-700', ended: 'bg-red-100 text-red-600' }
                  const MODE_LABELS: Record<string, string> = { classic: '🎵 Classique', buzzer: '🔔 Buzzer', teams: '👥 Équipes', saboteur: '🕵️ Saboteur', streamclash: '⚡ StreamClash' }
                  return (
                    <div key={room.code} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display font-bold text-slate-900 text-2xl tracking-widest">{room.code}</p>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">{MODE_LABELS[room.settings.mode] ?? room.settings.mode} · {room.settings.rounds} rounds</p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1.5 ${STATUS_COLORS[room.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {room.status === 'playing' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          {STATUS_LABELS[room.status] ?? room.status}
                        </span>
                      </div>

                      {room.status === 'playing' && room.totalRounds > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Round {room.currentRound} / {room.totalRounds}</span>
                            <span>{Math.round((room.currentRound / room.totalRounds) * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${(room.currentRound / room.totalRounds) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {room.settings.genres && room.settings.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {room.settings.genres.map((g) => (
                            <span
                              key={g}
                              className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                              style={{
                                color: GENRE_COLORS[g as Genre] ?? '#94a3b8',
                                backgroundColor: (GENRE_COLORS[g as Genre] ?? '#94a3b8') + '15',
                                borderColor: (GENRE_COLORS[g as Genre] ?? '#94a3b8') + '40',
                              }}
                            >
                              {GENRE_LABELS[g as Genre] ?? g}
                            </span>
                          ))}
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          {room.players.length} joueur{room.players.length !== 1 ? 's' : ''}
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
                              <span className="text-xs text-slate-700 font-medium">{p.name}{p.isHost ? ' 👑' : ''}</span>
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

        {/* ══ CHARTS ══════════════════════════════════════════════════ */}
        {tab === 'charts' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800">Charts Deezer</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Synchronisation automatique · {chartSongs.length} chansons en DB
                </p>
              </div>
              <button
                onClick={fetchCharts}
                className="text-xs text-primary border border-primary/20 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-primary/5 transition-colors"
              >
                ↻ Actualiser
              </button>
            </div>

            {/* Formulaire ajout playlist */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Ajouter une playlist Deezer</p>
                <p className="text-xs text-slate-400 mt-0.5">Colle l'URL d'une playlist. Elle apparaîtra dans le genre picker StreamClash.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newPlaylistUrl}
                  onChange={(e) => setNewPlaylistUrl(e.target.value)}
                  placeholder="https://www.deezer.com/fr/playlist/..."
                  className="col-span-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-sm font-mono"
                />
                <input
                  type="text"
                  value={newPlaylistLabel}
                  onChange={(e) => setNewPlaylistLabel(e.target.value)}
                  placeholder="Nom affiché (ex: Rock 90s)"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPlaylistEmoji}
                    onChange={(e) => setNewPlaylistEmoji(e.target.value.slice(0, 2))}
                    placeholder="🎵"
                    className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary/60 text-center text-lg"
                  />
                  <div className="flex flex-wrap gap-1.5 items-center flex-1">
                    {['#f97316','#f59e0b','#10b981','#ef4444','#0ea5e9','#ec4899','#ea580c','#0284c7','#14b8a6'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewPlaylistColor(c)}
                        className={`w-6 h-6 rounded-full flex-shrink-0 cursor-pointer transition-transform hover:scale-110 ${newPlaylistColor === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Aperçu */}
              {(newPlaylistLabel || newPlaylistEmoji !== '🎵') && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-400">Aperçu :</p>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                    style={{ color: newPlaylistColor, backgroundColor: newPlaylistColor + '15', borderColor: newPlaylistColor + '40' }}
                  >
                    {newPlaylistEmoji} {newPlaylistLabel || 'Nom de la playlist'}
                  </span>
                </div>
              )}

              {playlistError && <p className="text-xs text-red-500">{playlistError}</p>}
              <motion.button
                onClick={addPlaylist}
                disabled={playlistSaving || !newPlaylistUrl.trim() || !newPlaylistLabel.trim()}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-orange-600 transition-colors cursor-pointer"
              >
                {playlistSaving ? 'Création...' : '+ Ajouter la playlist'}
              </motion.button>

              {/* Playlists custom existantes */}
              {customPlaylists.length > 0 && (
                <div className="space-y-1 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {customPlaylists.length} playlist{customPlaylists.length > 1 ? 's' : ''} custom
                  </p>
                  {customPlaylists.map((p) => {
                    const syncInfo = chartSyncInfos.find((i) => i.source === p.id)
                    return (
                      <div key={p.id} className="flex items-center gap-3 py-2 rounded-xl hover:bg-slate-50 px-2 transition-colors">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{p.emoji} {p.label}</p>
                          <p className="text-xs text-slate-400 truncate">{syncInfo?.count ?? 0} chansons</p>
                        </div>
                        <motion.button
                          onClick={() => triggerSync(p.id)}
                          disabled={chartSyncing}
                          whileTap={{ scale: 0.95 }}
                          className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          ⚡ Sync
                        </motion.button>
                        <motion.button
                          onClick={() => deletePlaylist(p.id, p.label)}
                          whileTap={{ scale: 0.9 }}
                          className="px-2.5 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          ✕
                        </motion.button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sources de sync */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sources configurées</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {chartSyncInfos.length === 0 ? (
                  <div className="col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center text-slate-400 text-sm">
                    Aucune source — synchronisez une playlist pour commencer.
                  </div>
                ) : chartSyncInfos.map((info) => {
                  const lastDate = info.syncedAt
                    ? new Date(info.syncedAt * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : null
                  return (
                    <div key={info.source} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{info.label}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{info.source}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          info.status === 'ok' ? 'bg-emerald-100 text-emerald-700'
                            : info.status === 'never' ? 'bg-slate-100 text-slate-500'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {info.status === 'ok' ? '✓ OK' : info.status === 'never' ? 'Jamais sync' : '⚠ Erreur'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{info.count}</span> chansons
                        {lastDate && <> · {lastDate}</>}
                      </p>
                      <motion.button
                        onClick={() => triggerSync(info.source)}
                        disabled={chartSyncing}
                        whileTap={{ scale: 0.95 }}
                        className="w-full py-2 bg-primary text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-orange-600 transition-colors cursor-pointer"
                      >
                        {chartSyncing ? 'Synchronisation...' : '⚡ Synchroniser'}
                      </motion.button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Liste des chansons */}
            {chartSongs.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">{chartSongs.length} chansons actuelles</p>
                  <p className="text-xs text-slate-400">Previews Deezer · chargement quasi instantané</p>
                </div>
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {chartSongs.map((song) => (
                    <div key={song.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <span className="text-xs font-bold text-slate-300 w-6 text-right flex-shrink-0">{song.position ?? '—'}</span>
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                        {song.cover_url
                          ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">♪</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{song.title}</p>
                        <p className="text-xs text-slate-400 truncate">{song.artist} · {song.year}</p>
                      </div>
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

        {/* ══ SETTINGS ════════════════════════════════════════════════ */}
        {tab === 'settings' && (
          <div className="max-w-2xl space-y-5">

            {/* Section 1 — Accès aux parties */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔐</span>
                <h2 className="text-base font-bold text-slate-800">Accès aux parties</h2>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Mot de passe requis</p>
                  <p className="text-xs text-slate-400 mt-0.5">Les joueurs doivent entrer un mot de passe pour créer une partie.</p>
                </div>
                <Toggle value={requireRoomPassword} onChange={setRequireRoomPassword} />
              </div>
              {requireRoomPassword && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mot de passe</label>
                  <input
                    type="text"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    placeholder="Minimum 4 caractères"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-sm font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-1">Partagez uniquement avec les hôtes autorisés.</p>
                </div>
              )}
            </div>

            {/* Section 2 — Paramètres par défaut */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="flex items-start gap-2">
                <span className="text-lg">🎮</span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Paramètres par défaut des parties</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Valeurs pré-remplies à la création d'une nouvelle salle.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de rounds par défaut</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() => setDefaultRounds(n)}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${
                        defaultRounds === n
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Valeur actuelle : {defaultRounds} rounds</p>
              </div>
            </div>

            {/* Section 3 — Maintenance */}
            <div className={`bg-white border rounded-2xl shadow-sm p-6 space-y-5 ${maintenanceMode ? 'border-amber-200' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <h2 className="text-base font-bold text-slate-800">Mode maintenance</h2>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Activer la maintenance</p>
                  <p className="text-xs text-slate-400 mt-0.5">Bloque la création et le rejoint de parties. Affiche un message aux joueurs.</p>
                </div>
                <Toggle value={maintenanceMode} onChange={setMaintenanceMode} />
              </div>
              {maintenanceMode && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Message affiché aux joueurs</label>
                  <textarea
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                  />
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-amber-600 mb-1">Aperçu du message</p>
                    <p className="text-sm text-amber-800">{maintenanceMessage || '...'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bouton save */}
            <div className="flex items-center gap-3 pb-4">
              <motion.button
                onClick={saveSettings}
                disabled={settingsLoading || (requireRoomPassword && roomPassword.trim().length < 4)}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-orange-600 transition-colors cursor-pointer"
              >
                {settingsLoading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </motion.button>
              <AnimatePresence>
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
              </AnimatePresence>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
