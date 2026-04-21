import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { usePlayerStore, AVATAR_COLORS } from '../store/usePlayerStore'

type Section = 'profile' | 'password' | 'danger'

export function SettingsPage() {
  const { user, token, updateUser, logout } = useAuthStore()
  const { setName, setAvatarColor } = usePlayerStore()
  const navigate = useNavigate()

  const [section, setSection] = useState<Section>('profile')

  // Profile
  const [username, setUsername] = useState(user?.username ?? '')
  const [avatarColor, setAvatarColorLocal] = useState(user?.avatarColor ?? '#7c3aed')
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Password
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwdLoading, setPwdLoading] = useState(false)

  // Delete
  const [deletePwd, setDeletePwd] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  if (!user || !token) {
    navigate('/auth')
    return null
  }

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const saveProfile = async () => {
    if (username.trim().length < 2) { setProfileMsg({ ok: false, text: 'Pseudo trop court' }); return }
    setProfileLoading(true)
    setProfileMsg(null)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ username: username.trim(), avatarColor }),
      })
      const data = await res.json()
      if (!res.ok) { setProfileMsg({ ok: false, text: data.error }); return }
      updateUser({ username: data.user.username, avatarColor: data.user.avatarColor })
      setName(data.user.username)
      setAvatarColor(data.user.avatarColor)
      setProfileMsg({ ok: true, text: 'Profil mis à jour' })
    } catch {
      setProfileMsg({ ok: false, text: 'Erreur serveur' })
    } finally {
      setProfileLoading(false)
    }
  }

  const changePassword = async () => {
    if (newPwd !== confirmPwd) { setPwdMsg({ ok: false, text: 'Les mots de passe ne correspondent pas' }); return }
    if (newPwd.length < 6) { setPwdMsg({ ok: false, text: 'Minimum 6 caractères' }); return }
    setPwdLoading(true)
    setPwdMsg(null)
    try {
      const res = await fetch('/api/auth/me/password', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (!res.ok) { setPwdMsg({ ok: false, text: data.error }); return }
      setPwdMsg({ ok: true, text: 'Mot de passe modifié' })
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch {
      setPwdMsg({ ok: false, text: 'Erreur serveur' })
    } finally {
      setPwdLoading(false)
    }
  }

  const deleteAccount = async () => {
    setDeleteLoading(true)
    setDeleteMsg('')
    try {
      const res = await fetch('/api/auth/me', {
        method: 'DELETE',
        headers: authHeaders,
        body: JSON.stringify({ password: deletePwd }),
      })
      const data = await res.json()
      if (!res.ok) { setDeleteMsg(data.error); return }
      logout()
      navigate('/')
    } catch {
      setDeleteMsg('Erreur serveur')
    } finally {
      setDeleteLoading(false)
    }
  }

  const NAV: { key: Section; label: string }[] = [
    { key: 'profile', label: 'Profil' },
    { key: 'password', label: 'Mot de passe' },
    { key: 'danger', label: 'Compte' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mr-1">
            ←
          </button>
          <div className="flex items-end gap-0.5 h-5">
            {[0.5, 0.9, 1, 0.7, 0.85].map((h, i) => (
              <div key={i} className="w-1 rounded-full bg-primary animate-waveform"
                style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <span className="font-display text-xl font-extrabold text-slate-900">
            Beat<span className="text-primary">Blind</span>
          </span>
          <span className="text-slate-400 text-sm ml-1">· Paramètres</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-44 flex-shrink-0 space-y-1">
          {NAV.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                section === key
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {section === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5"
              >
                <h2 className="font-bold text-slate-900 text-lg">Profil</h2>

                {/* Avatar preview + color */}
                <div className="flex items-center gap-4">
                  <motion.div
                    key={avatarColor}
                    initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {username[0]?.toUpperCase() || '?'}
                  </motion.div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Couleur d'avatar</p>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_COLORS.map((c) => (
                        <motion.button
                          key={c}
                          onClick={() => setAvatarColorLocal(c)}
                          whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}
                          className="w-6 h-6 rounded-full border-2 cursor-pointer"
                          style={{
                            backgroundColor: c,
                            borderColor: avatarColor === c ? c : 'transparent',
                            outline: avatarColor === c ? `3px solid ${c}40` : 'none',
                            outlineOffset: '2px',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Pseudo</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={20}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Email</label>
                  <input
                    value={user.email}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-400 text-sm cursor-not-allowed"
                  />
                </div>

                {profileMsg && (
                  <p className={`text-sm ${profileMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{profileMsg.text}</p>
                )}

                <motion.button
                  onClick={saveProfile}
                  disabled={profileLoading}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-40 cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {profileLoading ? 'Enregistrement...' : 'Enregistrer'}
                </motion.button>
              </motion.div>
            )}

            {section === 'password' && (
              <motion.div key="password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4"
              >
                <h2 className="font-bold text-slate-900 text-lg">Changer le mot de passe</h2>
                {[
                  { label: 'Mot de passe actuel', value: currentPwd, set: setCurrentPwd },
                  { label: 'Nouveau mot de passe', value: newPwd, set: setNewPwd },
                  { label: 'Confirmer le nouveau', value: confirmPwd, set: setConfirmPwd },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
                    <input
                      type="password"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm"
                    />
                  </div>
                ))}
                {pwdMsg && (
                  <p className={`text-sm ${pwdMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{pwdMsg.text}</p>
                )}
                <motion.button
                  onClick={changePassword}
                  disabled={pwdLoading}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-40 cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {pwdLoading ? 'Modification...' : 'Modifier le mot de passe'}
                </motion.button>
              </motion.div>
            )}

            {section === 'danger' && (
              <motion.div key="danger" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Déconnexion */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-slate-900 mb-1">Déconnexion</h3>
                  <p className="text-slate-500 text-sm mb-4">Tu resteras inscrit, tu pourras te reconnecter à tout moment.</p>
                  <motion.button
                    onClick={() => { logout(); navigate('/') }}
                    whileTap={{ scale: 0.97 }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm cursor-pointer transition-colors"
                  >
                    Se déconnecter
                  </motion.button>
                </div>

                {/* Supprimer le compte */}
                <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-red-600 mb-1">Supprimer mon compte</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    Action irréversible. Toutes tes données et stats seront supprimées définitivement.
                  </p>
                  {!deleteConfirm ? (
                    <motion.button
                      onClick={() => setDeleteConfirm(true)}
                      whileTap={{ scale: 0.97 }}
                      className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-semibold text-sm cursor-pointer transition-colors"
                    >
                      Supprimer mon compte
                    </motion.button>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">Confirme avec ton mot de passe :</p>
                      <input
                        type="password"
                        value={deletePwd}
                        onChange={(e) => setDeletePwd(e.target.value)}
                        placeholder="Ton mot de passe"
                        className="w-full bg-slate-50 border border-red-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 text-sm"
                      />
                      {deleteMsg && <p className="text-red-500 text-sm">{deleteMsg}</p>}
                      <div className="flex gap-2">
                        <motion.button
                          onClick={deleteAccount}
                          disabled={deleteLoading || !deletePwd}
                          whileTap={{ scale: 0.97 }}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 cursor-pointer transition-colors"
                        >
                          {deleteLoading ? 'Suppression...' : 'Confirmer la suppression'}
                        </motion.button>
                        <button
                          onClick={() => { setDeleteConfirm(false); setDeletePwd(''); setDeleteMsg('') }}
                          className="px-5 py-2.5 text-slate-500 hover:text-slate-700 text-sm cursor-pointer transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
