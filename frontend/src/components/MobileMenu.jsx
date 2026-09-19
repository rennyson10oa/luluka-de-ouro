import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import useVoteNav from '../hooks/useVoteNav'
import Trophy3DIcon from './Trophy3DIcon'

/**
 * MobileMenu — navegação em tela cheia para telas pequenas (< md).
 *
 * Design pedido pelo dono: o clique no ícone de perfil do Header abre um
 * overlay onde a TAÇA 3D OCUPA A TELA INTEIRA, girando (reaproveitando o
 * modelo/cache do Trophy3DIcon via useGLTF), e as opções de navegação
 * ficam na parte de cima, sobre a taça.
 *
 * Comportamento:
 *   - Links grandes de toque; os mesmos destinos do nav pill do desktop.
 *   - "Votação" é auth-aware (useVoteNav) e fecha o menu antes de navegar.
 *   - Fecha com X, tecla Esc ou clique no fundo; trava o scroll do body.
 *   - Renderizado apenas quando open=true (overlay desmonta por completo).
 */

const LINKS = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/candidaturas', label: 'Candidaturas', icon: 'how_to_reg' },
  { to: '/reveal', label: 'A Cerimônia', icon: 'celebration' },
  { to: '/resultados', label: 'Galeria de Resultados', icon: 'emoji_events' },
  { to: '/admin', label: 'Painel Admin', icon: 'admin_panel_settings' },
]

export default function MobileMenu({ open, onClose }) {
  const { isAuthenticated, user } = useAuth()
  const goVote = useVoteNav()
  const location = useLocation()

  // Esc fecha + trava o scroll do body enquanto o menu está aberto.
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.code === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  function handleVote() {
    onClose()
    goVote()
  }

  const currentPath = location.pathname

  function linkClasses(isActive) {
    return `flex items-center gap-3 px-4 py-3 rounded-xl font-sans font-semibold text-body-lg transition-colors ${
      isActive
        ? 'bg-primary-container/20 text-primary border border-primary-container/40'
        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low/70'
    }`
  }

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação da gala">
      {/* Fundo: vinheta dourada + troféu 3D girando em tela cheia */}
      <div className="absolute inset-0 bg-surface/95 backdrop-blur-xl" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        aria-hidden="true"
      >
        <Trophy3DIcon width="100vw" height={420} />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[380px] bg-primary/10 blur-[110px] rounded-full pointer-events-none" aria-hidden="true" />

      {/* Botão de fechar */}
      <button
        type="button"
        onClick={onClose}
        title="Fechar menu"
        className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-surface-container-high/90 border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[22px]">close</span>
      </button>

      {/* Opções — na parte de cima da taça */}
      <div className="relative z-10 flex flex-col h-full px-6 pt-10 pb-12">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-[0.25em]">
            Navegação da Gala
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        </div>

        <nav className="flex flex-col gap-1 max-w-sm w-full mx-auto">
          {LINKS.map(({ to, label, icon }) => (
            <Link key={to} to={to} onClick={onClose} className={linkClasses(currentPath === to)}>
              <span className="material-symbols-outlined text-[24px]">{icon}</span>
              {label}
            </Link>
          ))}

          {/* Votação — auth-aware e fecha o menu antes de navegar */}
          <button type="button" onClick={handleVote} className={linkClasses(currentPath === '/votar')}>
            <span className="material-symbols-outlined text-[24px]">how_to_vote</span>
            Votação
          </button>

          {/* Entrada de conta: perfil (logado) ou login (deslogado) */}
          {isAuthenticated ? (
            <Link to="/perfil" onClick={onClose} className={linkClasses(currentPath === '/perfil')}>
              <span className="material-symbols-outlined text-[24px]">person</span>
              Perfil de @{user?.username}
            </Link>
          ) : (
            <Link to="/login" onClick={onClose} className={linkClasses(currentPath === '/login')}>
              <span className="material-symbols-outlined text-[24px]">login</span>
              Entrar na Gala
            </Link>
          )}
        </nav>

        <p className="mt-auto text-center font-sans text-[11px] text-outline select-none">
          ACADEMIA DAS ARTES E ZOAÇÕES • EDIÇÃO 2025
        </p>
      </div>
    </div>
  )
}
