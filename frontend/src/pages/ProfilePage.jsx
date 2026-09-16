import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import Header from '../components/Header'
import { Footer } from '../components/Footer'
import ProfileHeader from '../components/profile/ProfileHeader'
import HonorsCard from '../components/profile/HonorsCard'
import AccountSettings from '../components/profile/AccountSettings'
import MyCandidacies from '../components/profile/MyCandidacies'
import ActivityTimeline from '../components/profile/ActivityTimeline'

/**
 * Chequeo síncrono de sesión. useAuth hidrata de forma asíncrona (useEffect),
 * así que en el 1er render tras navegar desde /login el estado aún es null.
 * Sin este chequeo, un usuario logueado recibiría un redirect falso a /login.
 */
function hasStoredSession() {
  try {
    return Boolean(localStorage.getItem('pg_user'))
  } catch {
    return false
  }
}

/**
 * ProfilePage — Perfil del Usuario (/perfil).
 * Guard idéntico al VotePage: sin sesión → /login; sesión guardada pero
 * useAuth aún hidratando → pantalla de verificación.
 * Layout: grid 12 col (5 sticky izquierda / 7 derecha) según perfil.html.
 */
export default function ProfilePage() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  // ---- Guard de auth ----
  if (!isAuthenticated) {
    if (!hasStoredSession()) {
      return <Navigate to="/login" replace />
    }
    // Sesión guardada pero useAuth aún hidratando (1er render tras navegación).
    return (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-28">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
            <span className="font-sans text-body-sm text-on-surface-variant">Verificando credenciales notariales...</span>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-12 pt-28 pb-24">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* ---- Columna izquierda (sticky) ---- */}
          <aside className="xl:col-span-5 flex flex-col gap-6 xl:sticky xl:top-28">
            <ProfileHeader user={user} />
            <HonorsCard />

            {/* Logout — vermelho suave */}
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="w-full py-3 rounded-xl bg-error-container/20 hover:bg-error-container/40 text-error font-sans font-bold text-body-md border border-error/30 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sair da Gala
            </button>
          </aside>

          {/* ---- Columna derecha ---- */}
          <section className="xl:col-span-7 flex flex-col gap-6">
            <AccountSettings user={user} onToast={showToast} />
            <MyCandidacies onToast={showToast} />
            <ActivityTimeline />
          </section>
        </div>
      </main>
      <Footer />

      {/* ---- Toast (padrón AdminPanel) ---- */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-highest/95 backdrop-blur-xl px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-primary-container/30">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span className="font-sans text-body-md text-on-surface">{toast}</span>
        </div>
      )}
    </div>
  )
}