import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './hooks/useAuth'
import { AdminAuthProvider } from './hooks/useAdminAuth'
import { GalaEventsProvider } from './hooks/useGalaEvents'

// Code splitting por rota: sem isso TODO página baixava o site inteiro
// (~1.3 MB de JS) antes de pintar qualquer coisa. Cada rota vira um chunk
// próprio, e o three.js sai do caminho crítico do login/perfil.
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const VotePage = lazy(() => import('./pages/VotePage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ResultsPage = lazy(() => import('./pages/ResultsPage'))
const RevealPage = lazy(() => import('./pages/RevealPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const CandidacyPage = lazy(() => import('./pages/CandidacyPage'))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <p className="gold-gradient-text font-serif text-lg animate-pulse">Preparando a gala...</p>
    </div>
  )
}

function App() {
  return (
    // AuthProvider acima do Router: estado de auth único para toda a app
    // (ADR-0001) — updates no perfil refletem em Header/perfil sem reload.
    // AdminAuthProvider idem para a sessão administrativa (Task 8).
    <AuthProvider>
      <AdminAuthProvider>
        {/* Stream único da gala (SSE, ADR-0003): precisa do AuthProvider. */}
        <GalaEventsProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/votar" element={<VotePage />} />
                <Route path="/perfil" element={<ProfilePage />} />
                <Route path="/candidaturas" element={<CandidacyPage />} />
                <Route path="/resultados" element={<ResultsPage />} />
                <Route path="/reveal" element={<RevealPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </GalaEventsProvider>
      </AdminAuthProvider>
    </AuthProvider>
  )
}

export default App
