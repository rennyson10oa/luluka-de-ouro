import { Link } from 'react-router-dom'
import useCandidacies from '../../hooks/useCandidacies'

/**
 * MyCandidacies — "Painel Eleitoral Próprio / Minhas Candidaturas Homologadas".
 * Lê o store compartilhado (pg_candidacies) via useCandidacies — os mesmos
 * dados da Urna de Candidaturas (/candidaturas).
 */
export default function MyCandidacies({ onToast }) {
  const { candidacies, usedCount, maxCandidacies, remaining, shareText } = useCandidacies()

  function handleShare(c) {
    const text = shareText(c)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => onToast('Pitch copiado — manda no Zap!'))
        .catch(() => onToast('Não consegui copiar sozinho, copia na mão aí'))
    } else {
      onToast('Seu navegador não suporta cópia automática')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Cabeçalho ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary mb-0.5">
            <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
            <span className="text-label-sm uppercase tracking-widest font-bold">Painel Eleitoral Próprio</span>
          </div>
          <h3 className="font-serif font-bold text-headline-sm text-on-surface">Minhas Candidaturas Homologadas</h3>
        </div>
        <span className="text-label-sm text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full w-fit">
          {usedCount} de {maxCandidacies} submissões utilizadas
        </span>
      </div>

      {/* ---- Cards de candidaturas (do store compartilhado) ---- */}
      {candidacies.length === 0 ? (
        <div className="bg-surface-container/75 backdrop-blur-xl rounded-2xl p-6 shadow-xl text-center">
          <p className="font-sans text-body-sm text-on-surface-variant">
            Nenhuma candidatura registrada ainda. Lance seu nome na Urna de Candidaturas!
          </p>
        </div>
      ) : (
        candidacies.map((c) => (
          <div key={c.id} className="bg-surface-container/75 backdrop-blur-xl rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-container to-surface-container-highest flex items-center justify-center text-on-primary shadow-md flex-shrink-0">
                  <span className="text-[24px]">{c.categoryEmoji}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-label-sm text-primary uppercase tracking-widest">Categoria Magna</span>
                  <h4 className="font-serif font-bold text-title-lg text-on-surface truncate">{c.categoryTitle}</h4>
                </div>
              </div>
              <span className="bg-primary/20 text-primary-fixed text-label-sm px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 font-semibold shrink-0">
                <span className="material-symbols-outlined text-[14px]">task_alt</span>
                {c.status === 'homologada' ? 'Homologada' : 'Em Disputa'} ✓
              </span>
            </div>

            <div className="relative bg-surface-container-lowest/80 rounded-xl p-4 my-4">
              <span className="absolute top-2 left-3 text-headline-lg text-primary/20 leading-none select-none">"</span>
              <p className="font-sans text-body-md text-on-surface italic relative z-10 pl-4 pr-2 pt-1">{c.pitch}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-on-surface-variant text-body-sm">
              <div className="flex items-center gap-3">
                <span className="text-label-sm bg-surface-container-highest px-2 py-0.5 rounded text-on-surface font-mono">{c.protocol}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/candidaturas"
                  title="Editar na Urna de Candidaturas"
                  className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-sm uppercase tracking-wider px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">edit_note</span>
                  Retificar
                </Link>
                <button
                  type="button"
                  onClick={() => handleShare(c)}
                  className="bg-surface-container-highest hover:bg-surface-bright text-primary text-label-sm uppercase tracking-wider px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">share</span>
                  Compartilhar
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* ---- Banner de candidaturas livres ---- */}
      <div className="bg-gradient-to-r from-surface-container/40 via-surface-container-high/40 to-surface-container/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left relative overflow-hidden shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[26px]">add_circle</span>
          </div>
          <div>
            <h4 className="font-serif font-bold text-title-md text-on-surface">
              {remaining > 0 ? `Ainda restam ${remaining} candidaturas livres!` : 'Dossiê completo — todas as submissões utilizadas!'}
            </h4>
            <p className="font-sans text-body-sm text-on-surface-variant">
              {remaining > 0 ? 'Lance seu nome antes do encerramento das urnas.' : 'A Urna de Candidaturas está com o dossiê fechado.'}
            </p>
          </div>
        </div>
        <Link
          to="/candidaturas"
          className="bg-surface-container-high hover:bg-surface-bright text-primary text-title-md font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
        >
          <span>+ Lançar Candidatura</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  )
}