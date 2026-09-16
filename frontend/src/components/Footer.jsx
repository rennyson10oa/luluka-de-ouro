import { Link } from 'react-router-dom'
import useVoteNav from '../hooks/useVoteNav'

// ---------------------------------------------------------------------------
// Footer — Rodapé de Gala completo (Footer Master, seção 2 da biblioteca)
// ---------------------------------------------------------------------------

export function Footer() {
  const goVote = useVoteNav()

  /**
   * Helper: botão/link de navegação auth-aware para a cédula.
   * Se autenticado → /votar; senão → /login.
   */
  function handleVoteClick(e) {
    e.preventDefault()
    goVote()
  }

  return (
    <footer className="w-full bg-surface-container-lowest py-space-xl shadow-[0_-1px_12px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-8">

        {/* ---- Faixa Superior de Protocolo Notarial ---- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-outline-variant/40 text-xs text-on-surface-variant">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <strong className="text-on-surface-variant">Sessão Notarial Criptografada</strong>
            </span>
            <span className="text-outline/40">•</span>
            <span>Protocolo Oficial de Votações 2025</span>
          </div>

          <div className="flex items-center gap-5 text-on-surface-variant">
            <a href="#" className="hover:text-secondary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">menu_book</span>
              <span>Regimento do Deboche</span>
            </a>
            <span className="text-outline/40">•</span>
            <a href="#" className="hover:text-secondary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">support_agent</span>
              <span>Chamar Juiz de Paz</span>
            </a>
            <span className="text-outline/40">•</span>
            <a href="#" className="hover:text-secondary transition-colors">
              <span>Estatuto da Zoeira</span>
            </a>
          </div>
        </div>

        {/* ---- Corpo Principal (3 colunas) ---- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">

          {/* Col 1 — Manifesto & Branding */}
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">stars</span>
              <h3 className="font-serif text-base font-bold text-on-surface">
                Academia das Artes e Zoações do Grupo
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-md">
              Celebrando a mediocridade épica, áudios intermináveis de WhatsApp e prints fora de contexto com a máxima pompa e circunstância permitida pela lei do boteco.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/40 text-[11px] text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Servidor da Gala: <strong className="text-emerald-400">100% Calmo & Alinhado</strong></span>
            </div>
          </div>

          {/* Col 2 — Navegação Rápida */}
          <div className="md:col-span-3 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Acesso aos Salões
            </h4>
            <ul className="space-y-1.5 text-xs text-on-surface-variant">
              <li><Link to="/candidaturas" className="hover:text-on-surface transition-colors">🏛️ Urna de Candidaturas</Link></li>
              <li>
                <a href="/votar" onClick={handleVoteClick} className="hover:text-on-surface transition-colors">
                  ⚡ Cédula de Votação Oficial
                </a>
              </li>
              <li><Link to="/reveal" className="hover:text-on-surface transition-colors">🍾 A Cerimônia de Reveal</Link></li>
              <li><Link to="/resultados" className="hover:text-on-surface transition-colors">🏆 Galeria de Imortais</Link></li>
              <li><Link to="/admin" className="hover:text-on-surface transition-colors">🔑 Painel dos Administradores</Link></li>
            </ul>
          </div>

          {/* Col 3 — Auditoria & Segurança */}
          <div className="md:col-span-3 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Auditoria Oficial
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Votação blindada por algoritmo anti-fraude e revisada por comissão soberana. Auto-voto é considerado golpe de estado.
            </p>
            <div className="pt-2">
              <span className="text-[10px] text-outline font-mono block">SHA-256 HASH: 8f9b...e21a</span>
              <span className="text-[10px] text-outline font-mono block">CARTÓRIO DO BOTECO • LIVRO IV</span>
            </div>
          </div>
        </div>

        {/* ---- Rodapé Final ---- */}
        <div className="pt-6 border-t border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-outline">
          <div>
            © 2025 Prêmios do Grupo. Nenhum admin foi ferido durante a contagem de votos.
          </div>
          <div className="flex items-center gap-4">
            <span>Edição Oficial 2025</span>
            <span>•</span>
            <span>Cripto-Zoeira 256-bit</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-outline hover:text-secondary cursor-pointer"
            >
              Voltar ao topo ↑
            </button>
          </div>
        </div>

      </div>
    </footer>
  )
}


// ---------------------------------------------------------------------------
// FooterAuth — variante minimalista para telas de autenticação
// (seção 3 da biblioteca, preview direito)
// ---------------------------------------------------------------------------

export function FooterAuth() {
  return (
    <footer className="w-full py-6 flex flex-col items-center justify-center text-center space-y-2">
      <span className="text-xs text-on-surface-variant">
        Sessão Notarial Criptografada • Cartório de Boteco • 2025
      </span>
      <p className="text-[11px] text-outline">
        © 2025 Academia das Artes e Zoações do Grupo. Nenhum admin foi ferido durante a contagem.
      </p>
    </footer>
  )
}