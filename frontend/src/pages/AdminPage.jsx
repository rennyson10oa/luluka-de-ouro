import Header from '../components/Header'
import { Footer, FooterAuth } from '../components/Footer'
import useAdminAuth from '../hooks/useAdminAuth'
import AdminGate from './admin/AdminGate'
import AdminPanel from './admin/AdminPanel'

/**
 * AdminPage — roteador interno de /admin.
 * Sem sessão soberana → AdminGate (senha) + FooterAuth;
 * com sessão → AdminPanel + Footer master.
 * O shell (header global fixo, fundo, footer) pertence a esta página.
 */
export default function AdminPage() {
  const { isAdmin } = useAdminAuth()

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header />
      {isAdmin ? (
        <AdminPanel />
      ) : (
        <main className="flex-grow relative flex items-center justify-center px-4 pt-28 pb-16 overflow-hidden">
          {/* Vinheta ambiental do gate */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-primary-container/15 via-primary/10 to-transparent rounded-full blur-[120px] opacity-70" />
            <div className="absolute -top-24 right-1/4 w-[420px] h-[420px] bg-tertiary-container/10 rounded-full blur-[100px]" />
          </div>
          <AdminGate />
        </main>
      )}
      {isAdmin ? <Footer /> : <FooterAuth />}
    </div>
  )
}
