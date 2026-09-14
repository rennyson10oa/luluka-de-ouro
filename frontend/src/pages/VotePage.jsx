import { Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

/**
 * VotePage — placeholder da cédula de votação.
 * Substituir pela implementação real quando a API /api/votes estiver pronta.
 */
export default function VotePage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <main className="flex-grow flex items-center justify-center px-6 py-16">
        <div className="relative w-full max-w-md text-center">
          {/* Glow de fundo */}
          <div className="absolute inset-0 -z-10 bg-primary/10 blur-[120px] rounded-full" />

          <div className="w-16 h-16 mx-auto rounded-full bg-surface-container flex items-center justify-center shadow-[0_0_24px_rgba(212,175,55,0.3)] mb-6">
            <span className="material-symbols-outlined text-primary text-[32px]">how_to_vote</span>
          </div>

          <h1 className="font-serif font-bold text-headline-md text-primary tracking-tight mb-2">
            Cédula de Votação
          </h1>
          <p className="font-sans text-body-md text-on-surface-variant mb-8">
            A urna está sendo lacrada pela Academia. Em breve você poderá depositar seu voto secreto.
          </p>

          {user && (
            <div className="inline-flex items-center gap-2 px-space-md py-space-xs rounded-full bg-surface-container-low mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-sans font-bold text-label-sm text-secondary">
                Sessão ativa: {user.username}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-space-sm">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-space-xs px-6 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans font-semibold text-title-md transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">arrow_back</span>
              Voltar à Gala
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center justify-center gap-space-xs px-6 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-error font-sans font-semibold text-title-md transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sair
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
