import { useEffect, useState } from 'react'

/**
 * CandidacyModal — "FORMULÁRIO DE PROTOCOLO • SEÇÃO IV".
 * Modo criação (category) ou edição (editing). Valida pitch 1..280 com
 * contador vivo; submit desabilitado fora da faixa.
 *
 * Props:
 *   open      — controla a visibilidade do modal.
 *   onClose   — fecha o modal.
 *   category  — objeto MOCK_CATEGORIES (modo criação) ou null.
 *   editing   — candidatura existente (modo edição) ou null.
 *   onSubmit  — (pitch) => { success, error }.
 */

export default function CandidacyModal({ open, onClose, category, editing, onSubmit }) {
  const [pitch, setPitch] = useState('')
  const [error, setError] = useState('')

  // Reinicia o formulário sempre que o modal abre (criação ou edição).
  useEffect(() => {
    if (open) {
      setPitch(editing ? editing.pitch : '')
      setError('')
    }
  }, [open, editing])

  if (!open) return null

  const count = pitch.length
  const valid = count >= 1 && count <= 280
  const counterClass = count > 280 ? 'text-error' : count >= 1 ? 'text-emerald-400' : 'text-outline'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const res = await onSubmit(pitch.trim())
    if (res && res.success) {
      onClose()
    } else {
      setError(res?.error || 'Não foi possível registrar a candidatura')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-surface-container-lowest/85 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card central glassmorphism */}
      <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-high/95 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_48px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.22)]">
        {/* Cabeçalho notarial */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold block mb-1">
              FORMULÁRIO DE PROTOCOLO • SEÇÃO IV
            </span>
            <h4 className="font-sans font-bold text-title-lg text-on-surface">
              {editing ? (
                <>
                  Retificar Campanha — <span className="font-mono text-primary">{editing.protocol}</span>
                </>
              ) : (
                <>
                  Lançar Campanha para: <span className="text-primary font-serif">{category?.emoji} {category?.title}</span>
                </>
              )}
            </h4>
            <p className="font-sans text-body-sm text-outline mt-0.5">
              {editing
                ? 'Ajuste o seu pitch perante a bancada soberana.'
                : 'Explique para a bancada soberana por que você merece este troféu de ouro.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-bright flex items-center justify-center text-outline hover:text-on-surface transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Banner de erro inline */}
        {error && (
          <div className="flex items-start gap-2 bg-error-container/20 px-3 py-2 rounded-lg mb-4">
            <span className="material-symbols-outlined text-error text-[18px] shrink-0">warning</span>
            <span className="font-sans text-body-sm text-error">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Textarea + contador vivo */}
          <div className="relative">
            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="Relate o seu momento de glória (ou desprovimento cognitivo)..."
              className="w-full rounded-xl bg-surface-container-lowest/90 px-4 py-3 font-sans text-body-md text-on-surface placeholder:text-outline focus:outline-none shadow-[0_0_20px_rgba(212,175,55,0.25)] resize-none transition-all"
            />
            <div className="flex items-center justify-end gap-1 mt-1.5 px-1">
              <span className={`font-label-sm text-label-sm font-semibold tracking-wider ${counterClass}`}>
                {count} / 280 caracteres
              </span>
            </div>
          </div>

          {/* Dica de humor */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest/60 mt-3">
            <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0">warning</span>
            <p className="font-sans text-body-sm text-on-surface-variant text-[12px] leading-tight">
              <strong className="text-tertiary">Mantenha o decoro:</strong> exageros são incentivados, mentiras serão checadas pelo bot do grupo.
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 mt-5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-bright text-on-surface-variant font-sans font-semibold text-body-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-body-md transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_28px_rgba(212,175,55,0.6)] hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{editing ? 'Salvar Retificação' : 'Registrar Candidatura'}</span>
              <span className="material-symbols-outlined text-[18px]">gavel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}