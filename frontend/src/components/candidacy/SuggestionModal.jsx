import { useEffect, useState } from 'react'
import apiFetch from '../../utils/api'
import UserPicker from '../UserPicker'

/**
 * SuggestionModal — "SUGESTÃO DE MEMÓRIA ALHEIA".
 *
 * Um eleitor lembra de uma situação de OUTRA pessoa e propõe um pitch para
 * uma categoria. O alvo recebe na caixa de entrada e decide aceitar/recusar;
 * nada é publicado por aqui. Copia a estrutura visual do CandidacyModal para
 * manter o padrão notarial da Urna de Candidaturas.
 *
 * O alvo é escolhido no UserPicker (combobox com busca, decisão do dono)
 * contra o diretório REAL de eleitores — sem convidados (nunca leriam a
 * caixa de entrada, sugerir para eles é sugestão pro limbo).
 *
 * Props:
 *   open      — controla a visibilidade.
 *   onClose   — fecha o modal.
 *   category  — { emoji, title } da categoria alvo.
 *   onSubmit  — ({ target_username, pitch }) => { success, error }.
 */

export default function SuggestionModal({ open, onClose, category, onSubmit }) {
  const [selectedUser, setSelectedUser] = useState(null)
  const [pitch, setPitch] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Reinicia o formulário a cada abertura: o modal é compartilhado entre
  // "Vagas Abertas" e "Minhas Candidaturas" e não deve herdar a categoria
  // anterior nem os campos digitados em uma sugestão cancelada. O diretório
  // é recarregado (usuários novos desde a última abertura entram na lista).
  useEffect(() => {
    if (open) {
      setSelectedUser(null)
      setPitch('')
      setError('')
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  const count = pitch.length
  const validPitch = count >= 1 && count <= 280
  const valid = Boolean(selectedUser) && validPitch
  const counterClass = count > 280 ? 'text-error' : count >= 1 ? 'text-emerald-400' : 'text-outline'

  // Diretório recarregado a cada MONTAGEM do picker (modal reaberto).
  async function loadDirectory() {
    const res = await apiFetch('/api/users/directory', { token: true })
    return res.ok && Array.isArray(res.data) ? res.data : []
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid || busy) return
    setError('')
    setBusy(true)
    const res = await onSubmit({
      target_username: selectedUser.username,
      pitch: pitch.trim(),
    })
    setBusy(false)
    if (res && res.success) {
      onClose()
    } else {
      setError(res?.error || 'Não foi possível enviar a sugestão')
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

      {/* Card central glassmorphism (mesmo padrão do CandidacyModal) */}
      <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-high/95 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_48px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.22)]">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold block mb-1">
              SUGESTÃO DE MEMÓRIA • SEÇÃO V
            </span>
            <h4 className="font-sans font-bold text-title-lg text-on-surface">
              Lembrar por alguém:{' '}
              <span className="text-primary font-serif">
                {category?.emoji} {category?.title}
              </span>
            </h4>
            <p className="font-sans text-body-sm text-outline mt-0.5">
              Ele lembra de uma situação que você não lembrou? Descreva aqui — quem decide é ele.
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
          <div className="flex items-start gap-2 bg-error-container/20 px-3 py-2 rounded-lg mb-4 border border-error/30">
            <span className="material-symbols-outlined text-error text-[18px] shrink-0">warning</span>
            <span className="font-sans text-body-sm text-error">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Alvo: UserPicker compartilhado (combobox com busca). */}
          <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5">
            Eleitor que vai receber a memória
          </label>
          <div className="mb-4">
            <UserPicker
              loadOptions={loadDirectory}
              value={selectedUser}
              onChange={setSelectedUser}
            />
          </div>

          {/* Pitch da memória + contador vivo */}
          <div className="relative">
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5">
              Pitch da memória
            </label>
            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="Descreva a situação que só você lembrava..."
              className="w-full rounded-xl bg-surface-container-lowest/90 px-4 py-3 font-sans text-body-md text-on-surface placeholder:text-outline focus:outline-none shadow-[0_0_20px_rgba(212,175,55,0.25)] resize-none transition-all"
            />
            <div className="flex items-center justify-end gap-1 mt-1.5 px-1">
              <span className={`font-label-sm text-label-sm font-semibold tracking-wider ${counterClass}`}>
                {count} / 280 caracteres
              </span>
            </div>
          </div>

          {/* Explicação curta da mecânica */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest/60 mt-3">
            <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0">forward_to_inbox</span>
            <p className="font-sans text-body-sm text-on-surface-variant text-[12px] leading-tight">
              O eleitor recebe na caixa de entrada e decide. Se aceitar, o pitch da candidatura dele nesta categoria é substituído.
            </p>
          </div>

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
              disabled={!valid || busy}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-body-md transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_28px_rgba(212,175,55,0.6)] hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{busy ? 'Enviando...' : 'Enviar Sugestão'}</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
