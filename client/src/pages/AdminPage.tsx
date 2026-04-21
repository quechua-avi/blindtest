import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const GENRE_ORDER: Genre[] = ['pop', 'hiphop', 'electronic', 'rnb', 'french', 'latin', 'jul']
const DECADE_ORDER: Decade[] = ['2000s', '2010s', '2020s']

export function AdminPage() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem(ADMIN_SECRET_KEY) ?? '')
  const [input, setInput] = useState('')
  const [songs, setSongs] = useState<AdminSong[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'songs' | 'users'>('songs')
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
      const [songsRes, usersRes] = await Promise.all([
        fetch(`/api/admin/songs?secret=${encodeURIComponent(s)}`),
        fetch(`/api/admin/users?secret=${encodeURIComponent(s)}`),
      ])
      if (songsRes.status === 401) {
        setError('Mot de passe incorrect')
        sessionStorage.removeItem(ADMIN_SECRET_KEY)
        setSecret('')
        return
      }
      const [songsData, usersData] = await Promise.all([songsRes.json(), usersRes.json()])
      setSongs(songsData.songs)
      setUsers(usersData.users ?? [])
      sessionStorage.setItem(ADMIN_SECRET_KEY, s)
      setSecret(s)
    } catch {
      setError('Impossible de joindre le serveur')
    } finally {
      setLoading(false)
    }
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
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
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
          {(['songs', 'users'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                tab === t
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'songs' ? `Chansons (${songs.length})` : `Utilisateurs (${users.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
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
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-slate-400 py-12">Aucun utilisateur inscrit</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === 'songs' && (
        <>{/* Stats */}
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
