import { useState } from 'react'
import { MOCK_CATEGORIES } from '../../data/mockAdmin'

/**
 * CandidacyCard — card de candidatura ativa na Urna de Candidaturas.
 * 3 variantes visuais:
 *   - 'em_disputa': badge âmbar "STATUS: EM DISPUTA" + campanha editável.
 *   - 'homologada': badge verde "🎉 Homologada!" + faixa de votos provisórios.
 *   - urnas fechadas (isClosed): badge outline "SELADO PARA A CERIMÔNIA",
 *     edição desabilitada (share continua liberado).
 */

/** Formata o createdAt como "HH:MM" (pt-BR). */
function formatSubmittedAt(iso) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '--:--'
    : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function CandidacyCard({ candidacy, isClosed, onEdit, onShare }) {
  const [expanded, setExpanded] = useState(false)

  // Descrição canônica da categoria (leitura apenas — nunca muta MOCK_CATEGORIES).
  const category = MOCK_CATEGORIES.find((c) => c.id === candidacy.categoryId) || null
  const description = category?.description || ''

  const isHomologada = candidacy.status === 'homologada'
  const canEdit = !isClosed

  return (
    <article className="relative bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg overflow-hidden">
      {/* Glow decorativo de gala */}
      <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

      {/* ---- Cabeçalho: emoji + título + descrição + badge ---- */}
      <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center text-3xl shadow-inner shrink-0">
            {candidacy.categoryEmoji}
          </div>
          <div className="min-w-0">
            <h3 className="font-serif font-bold text-headline-sm text-on-surface leading-tight">{candidacy.categoryTitle}</h3>
            <p className="font-sans text-body-sm text-on-surface-variant mt-0.5">{description}</p>
          </div>
        </div>

        {/* Badge de status */}
        {isClosed ? (
          <span className="shrink-0 px-3 py-1 rounded-full bg-surface-container-high text-outline font-label-sm text-label-sm border border-outline-variant/50 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            SELADO PARA A CERIMÔNIA
          </span>
        ) : isHomologada ? (
          <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-label-sm text-label-sm font-bold border border-emerald-500/30 flex items-center gap-1">
            🎉 Homologada!
          </span>
        ) : (
          <span className="shrink-0 px-3 py-1 rounded-full bg-primary/15 text-primary font-label-sm text-label-sm font-bold border border-primary/30 flex flex-col items-center gap-0.5">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">campaign</span>
              STATUS: EM DISPUTA
            </span>
            <span className="text-[10px] text-on-surface-variant font-normal normal-case tracking-normal">Campanha liberada até a Gala</span>
          </span>
        )}
      </div>

      {/* ---- Pitch em bloco citável ---- */}
      <div className="my-4 rounded-xl bg-surface-container/60 p-4">
        <p className={`font-sans text-body-md text-on-surface italic border-l-2 border-primary/40 pl-3 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
          {candidacy.pitch}
        </p>
        <div className="flex items-center justify-between gap-2 mt-3 pt-2 flex-wrap">
          {isHomologada ? (
            <span className="font-label-sm text-label-sm text-primary font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">bolt</span>
              PROTOCOLO VALIDADO
            </span>
          ) : (
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-mono">{candidacy.protocol}</span>
          )}
          <span className="font-sans text-body-sm text-outline text-[11px]">
            {isHomologada ? 'Certificado por 3 testemunhas' : `Submetido às ${formatSubmittedAt(candidacy.createdAt)}`}
          </span>
        </div>
      </div>

      {/* ---- Rodapé: nota + ações ---- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-outline-variant/20 relative z-10">
        <div className="flex items-center gap-1.5 text-outline">
          {isClosed ? (
            <>
              <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
              <span className="font-sans text-body-sm text-[11px]">Selo notarial aplicado — campanha congelada.</span>
            </>
          ) : isHomologada ? (
            <>
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="font-sans text-body-sm text-on-surface-variant text-[12px]">🔥 Votos provisórios começam em breve • Compartilhe seu pitch no Zap</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px] text-secondary">history_edu</span>
              <span className="font-sans text-body-sm text-[11px]">Campanha editável até a cerimônia.</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {/* Expandir/recolher pitch (só em disputa) */}
          {!isHomologada && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              title={expanded ? 'Recolher pitch' : 'Ver pitch completo'}
              className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">{expanded ? 'visibility_off' : 'visibility'}</span>
            </button>
          )}

          {/* Compartilhar (sempre liberado) */}
          <button
            type="button"
            onClick={() => onShare(candidacy)}
            className="inline-flex items-center gap-1 text-outline hover:text-primary transition-colors text-xs font-medium"
          >
            <span className="material-symbols-outlined text-[15px]">share</span>
            Compartilhar
          </button>

          {/* Editar / Retificar (bloqueado com urnas fechadas) */}
          <button
            type="button"
            onClick={() => onEdit(candidacy)}
            disabled={!canEdit}
            title={canEdit ? (isHomologada ? 'Retificar pitch' : 'Editar pitch') : 'Urnas fechadas: edição bloqueada'}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary font-sans font-semibold text-body-sm transition-all shadow-[0_0_10px_rgba(212,175,55,0.1)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px]">{isHomologada ? 'edit' : 'edit_note'}</span>
            {isHomologada ? 'Retificar Pitch' : 'Editar Pitch'}
          </button>
        </div>
      </div>
    </article>
  )
}