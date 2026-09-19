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
 * Cheque síncrono de sessão. O useAuth hidrata de forma assíncrona (useEffect),
 * então no 1º render após navegar de /login o estado ainda é null.
 * Sem este chequeo, um usuário logado receberia um redirect falso para /login.
 */
function hasStoredSession() {
  try {
    return Boolean(localStorage.getItem('pg_user'))
  } catch {
    return false
  }
}

/**
 * ProfilePage — Perfil do Usuário (/perfil).
 * Guard idêntico ao VotePage: sem sessão → /login; sessão salva mas
 * useAuth ainda hidratando → tela de verificação.
 * Layout: grid 12 colunas (5 fixas à esquerda / 7 à direita) conforme perfil.html.
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
      return <Navigate to="/login" replace state={{ from: '/perfil' }} />
    }
    // Sessão salva, mas o useAuth ainda está hidratando (1º render após a navegação).
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
          {/* ---- Coluna esquerda (fixa) ---- */}
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

          {/* ---- Coluna direita ---- */}
          <section className="xl:col-span-7 flex flex-col gap-6">
            <AccountSettings user={user} onToast={showToast} />
            <MyCandidacies onToast={showToast} />
            <ActivityTimeline />
          </section>
        </div>
      </main>
      <Footer />

      {/* ---- Toast (padrão AdminPanel) ---- */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-highest/95 backdrop-blur-xl px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-primary-container/30">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span className="font-sans text-body-md text-on-surface">{toast}</span>
        </div>
      )}
    </div>
  )
}