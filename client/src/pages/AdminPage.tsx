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

const GENRE_ORDER: Genre[] = ['pop', 'hiphop', 'electronic', 'rnb', 'french', 'latin', 'jul']
const DECADE_ORDER: Decade[] = ['2000s', '2010s', '2020s']

export function AdminPage() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem(ADMIN_SECRET_KEY) ?? '')
  const [input, setInput] = useState('')
  const [songs, setSongs] = useState<AdminSong[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterGenre, setFilterGenre] = useState<Genre | 'all'>('all')
  const [filterDecade, setFilterDecade] = useState<Decade | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'genre' | 'title' | 'artist' | 'year'>('genre')

  const isAuthed = !!secret && songs.length > 0

  useEffect(() => {
    if (secret) fetchSongs(secret)
  }, [])

  async function fetchSongs(s: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/songs?secret=${encodeURIComponent(s)}`)
      if (res.status === 401) {
        setError('Mot de passe incorrect')
        sessionStorage.removeItem(ADMIN_SECRET_KEY)
        setSecret('')
      } else {
        const data = await res.json()
        setSongs(data.songs)
        sessionStorage.setItem(ADMIN_SECRET_KEY, s)
        setSecret(s)
      }
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
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-card border border-bg-border rounded-2xl p-8 w-full max-w-sm space-y-4"
        >
          <h1 className="text-2xl font-bold font-display text-white text-center">Admin</h1>
          <p className="text-slate-400 text-sm text-center">Accès restreint</p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSongs(input)}
            placeholder="Mot de passe..."
            className="w-full bg-bg-surface border border-bg-border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <motion.button
            onClick={() => fetchSongs(input)}
            disabled={loading || !input}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Connexion...' : 'Accéder'}
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base text-white">
      {/* Header */}
      <div className="bg-bg-card border-b border-bg-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display">Admin · Bibliothèque</h1>
          <p className="text-slate-400 text-sm">{songs.length} chansons au total</p>
        </div>
        <motion.button
          onClick={() => { sessionStorage.removeItem(ADMIN_SECRET_KEY); setSongs([]); setSecret('') }}
          whileTap={{ scale: 0.95 }}
          className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
        >
          Déconnexion
        </motion.button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GENRE_ORDER.map((g) => (
            <div
              key={g}
              className="bg-bg-card border border-bg-border rounded-xl p-3 flex items-center justify-between"
              style={{ borderLeftColor: GENRE_COLORS[g], borderLeftWidth: 3 }}
            >
              <span className="text-sm text-slate-300">{GENRE_LABELS[g]}</span>
              <span className="text-lg font-bold" style={{ color: GENRE_COLORS[g] }}>
                {stats.byGenre[g] ?? 0}
              </span>
            </div>
          ))}
          {DECADE_ORDER.map((d) => (
            <div key={d} className="bg-bg-card border border-bg-border rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-slate-300">{d}</span>
              <span className="text-lg font-bold text-slate-200">{stats.byDecade[d] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-4 space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher titre, artiste, ID..."
            className="w-full bg-bg-surface border border-bg-border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Genre :</span>
            {(['all', ...GENRE_ORDER] as const).map((g) => (
              <motion.button
                key={g}
                onClick={() => setFilterGenre(g)}
                whileTap={{ scale: 0.9 }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  filterGenre === g
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-bg-border bg-bg-surface text-slate-400'
                }`}
                style={filterGenre === g && g !== 'all' ? { borderColor: GENRE_COLORS[g], color: GENRE_COLORS[g], backgroundColor: GENRE_COLORS[g] + '20' } : {}}
              >
                {g === 'all' ? 'Tous' : GENRE_LABELS[g]}
              </motion.button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Décennie :</span>
            {(['all', ...DECADE_ORDER] as const).map((d) => (
              <motion.button
                key={d}
                onClick={() => setFilterDecade(d)}
                whileTap={{ scale: 0.9 }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  filterDecade === d
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-bg-border bg-bg-surface text-slate-400'
                }`}
              >
                {d === 'all' ? 'Toutes' : d}
              </motion.button>
            ))}
            <span className="ml-auto text-xs text-slate-500">Trier :</span>
            {(['genre', 'title', 'artist', 'year'] as const).map((s) => (
              <motion.button
                key={s}
                onClick={() => setSortBy(s)}
                whileTap={{ scale: 0.9 }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  sortBy === s
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-bg-border bg-bg-surface text-slate-400'
                }`}
              >
                {s === 'genre' ? 'Genre' : s === 'title' ? 'Titre' : s === 'artist' ? 'Artiste' : 'Année'}
              </motion.button>
            ))}
          </div>
          <p className="text-xs text-slate-500">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Table */}
        <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border text-left">
                  <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold w-8">#</th>
                  <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Titre</th>
                  <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Artiste</th>
                  <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Année</th>
                  <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Genre</th>
                  <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Décennie</th>
                  <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">ID</th>
                  <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Deezer</th>
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
                      transition={{ duration: 0.15, delay: Math.min(i * 0.01, 0.3) }}
                      className="border-b border-bg-border/50 hover:bg-bg-surface/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-600 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 text-white font-medium">
                        {song.title}
                        {song.alternativeTitles && song.alternativeTitles.length > 0 && (
                          <div className="text-xs text-slate-600 mt-0.5">{song.alternativeTitles.join(', ')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {song.artist}
                        {song.alternativeArtists && song.alternativeArtists.length > 0 && (
                          <div className="text-xs text-slate-600 mt-0.5">{song.alternativeArtists.join(', ')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{song.year}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: GENRE_COLORS[song.genre] + '20', color: GENRE_COLORS[song.genre] }}
                        >
                          {GENRE_LABELS[song.genre]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{song.decade}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-slate-500 bg-bg-surface px-1.5 py-0.5 rounded">{song.id}</code>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={song.deezerWebUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
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
              <p className="text-center text-slate-500 py-12">Aucune chanson trouvée</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
