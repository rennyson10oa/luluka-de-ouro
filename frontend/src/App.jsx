import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { AdminAuthProvider } from './hooks/useAdminAuth'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VotePage from './pages/VotePage'
import AdminPage from './pages/AdminPage'
import ResultsPage from './pages/ResultsPage'
import RevealPage from './pages/RevealPage'
import ProfilePage from './pages/ProfilePage'
import CandidacyPage from './pages/CandidacyPage'

function App() {
  return (
    // AuthProvider acima do Router: estado de auth único para toda a app
    // (ADR-0001) — updates no perfil refletem em Header/perfil sem reload.
    // AdminAuthProvider idem para a sessão administrativa (Task 8).
    <AuthProvider>
      <AdminAuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
        </BrowserRouter>
      </AdminAuthProvider>
    </AuthProvider>
  )
}

export default App
