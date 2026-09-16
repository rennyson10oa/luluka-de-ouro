import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import useVoteNav from '../hooks/useVoteNav'
import Trophy3DIcon from './Trophy3DIcon'

// ---------------------------------------------------------------------------
// HeaderMaster — barra de navegação global, fixa no topo (default export)
// ---------------------------------------------------------------------------

export default function Header() {
  const { isAuthenticated, user } = useAuth()
  const goVote = useVoteNav()
  const navigate = useNavigate()
  const location = useLocation()

  // Determina qual item da nav está ativo com base no pathname + hash
  const currentPath = location.pathname + location.hash

  /**
   * Aplica classes condicionais de "ativo" ou "inativo" ao item da nav pill.
   */
  function navClasses(active) {
    const base = 'px-4 py-1.5 text-xs font-medium rounded-full transition-colors'
    if (active) {
      return `${base} text-primary-fixed bg-primary-container/15 border border-primary-container/30 shadow-sm`
    }
    return `${base} text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50`
  }

  // O item "Votação" fica ativo quando o usuário está em /votar
  const votacaoActive = currentPath === '/votar'

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.6),0_0_24px_0_rgba(212,175,55,0.08)]">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* ---- Logo / Brand ---- */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container/20 via-surface to-primary-container/10 border border-primary-container/40 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Trophy3DIcon />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-sm tracking-wider uppercase gold-gradient-text">
              Prêmios do Grupo 2025
            </span>
            <span className="text-[10px] tracking-widest text-on-surface-variant font-medium uppercase -mt-0.5">
              A Gala Suprema da Zoeira
            </span>
          </div>
        </Link>

        {/* ---- Nav Pill (desktop) ---- */}
        <nav className="hidden md:flex items-center gap-1 bg-surface-container/60 p-1 rounded-full border border-outline-variant/50">
          <Link to="/" className={navClasses(currentPath === '/')}>
            Início
          </Link>

          <Link
            to="/candidaturas"
            className={navClasses(currentPath === '/candidaturas')}
          >
            Candidaturas
          </Link>

          {/* Votação — botão auth-aware */}
          <button
            type="button"
            onClick={goVote}
            className={navClasses(votacaoActive)}
          >
            Votação
          </button>

          <Link
            to="/reveal"
            className={navClasses(currentPath === '/reveal')}
          >
            A Cerimônia
          </Link>

          <Link
            to="/resultados"
            className={navClasses(currentPath === '/resultados')}
          >
            Galeria de Resultados
          </Link>

          <Link
            to="/admin"
            className={navClasses(currentPath === '/admin') + ' flex items-center gap-1'}
          >
            <span className="material-symbols-outlined text-[14px] text-primary-container">admin_panel_settings</span>
            Admin
          </Link>
        </nav>

        {/* ---- CTA + Avatar (direita) ---- */}
        <div className="flex items-center gap-3 shrink-0">
          {/* CTA Votar Agora */}
          <button
            type="button"
            onClick={goVote}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-semibold text-xs shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:brightness-110 active:scale-95 transition-all"
          >
            <span>Votar Agora</span>
            <span className="material-symbols-outlined text-sm">how_to_vote</span>
          </button>

          {/* Perfil / Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/50">
            <button
              type="button"
              title={isAuthenticated ? `Perfil de @${user?.username}` : 'Entrar na Gala'}
              onClick={() => {
                // Deslogado, o clique expressa intenção de ver o perfil —
                // guarda o destino para o login devolver o usuário a /perfil.
                if (isAuthenticated) {
                  navigate('/perfil')
                } else {
                  navigate('/login', { state: { from: '/perfil' } })
                }
              }}
              className="w-9 h-9 rounded-full bg-surface-container border border-primary-container/40 flex items-center justify-center hover:border-primary-container transition-colors relative"
            >
              <span className="material-symbols-outlined text-xl text-on-surface-variant">person</span>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-surface rounded-full" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// HeaderAdmin — variante para o painel administrativo (/admin)
// Uso futuro. Recebe onLogout como prop opcional.
// ---------------------------------------------------------------------------

export function HeaderAdmin({ onLogout = () => { } }) {
  return (
    <header className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-container-lowest/90 backdrop-blur-xl rounded-lg border border-outline-variant/50">
      {/* Logo + badges */}
      <div className="flex items-center gap-4">
        <Link to="/admin" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-xl">gavel</span>
          <span className="font-serif text-sm font-bold text-on-surface">
            Console Soberano <span className="text-outline font-mono text-xs">(/admin)</span>
          </span>
        </Link>

        {/* Badges de sistema */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> FASTAPI + SQLITE
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-primary-container/10 text-primary-container border border-primary-container/20 font-mono">
            PROTOCOLO V25.4.1
          </span>
        </div>
      </div>

      {/* Identidade + logout */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-semibold text-on-surface">@AdminMor</p>
          <p className="text-[10px] text-primary">Superuser • Juiz de Paz</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-xs text-on-surface-variant flex items-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          <span>Sair</span>
        </button>
      </div>
    </header>
  )
}