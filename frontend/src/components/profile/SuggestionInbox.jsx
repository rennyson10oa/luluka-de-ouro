import { useCallback, useEffect, useState } from 'react'
import apiFetch, { extractErrorDetail } from '../../utils/api'

/**
 * SuggestionInbox — "Sugestões Recebidas" na coluna direita do perfil.
 *
 * Alimenta-se de GET /api/suggestions/me (o alvo autenticado). Cada pendente
 * pode ser ACEITA (substitui/cria a candidatura daquele alvo na categoria) ou
 * RECUSADA. Sem SSE de propósito: sugestão é conteúdo privado e o volume é
 * baixo — o header tem refresh manual para puxar o estado mais recente.
 *
 * A rejeição é VISÍVEL ao autor (decisão do dono): por isso o histórico
 * mostra "Aceita" e "Recusada" para quem recebeu, e o autor vê o status em
 * /api/suggestions/created (página de candidaturas).
 */

/** Formata a decisão no fuso do navegador; ausência vira "—". */
function formatDecision(raw) {
  if (!raw) return '—'
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR')
}

export default function SuggestionInbox({ onToast }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  // Id da sugestão em processamento (desabilita os botões daquele card só).
  const [busyId, setBusyId] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch('/api/suggestions/me', { token: true })
    if (!res.ok || !Array.isArray(res.data)) {
      // Degradação silenciosa: mantém a seção vazia em vez de quebrar o perfil.
      setSuggestions([])
      setLoading(false)
      return
    }
    setSuggestions(res.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const pending = suggestions.filter((s) => s.status === 'pending')
  const history = suggestions.filter((s) => s.status !== 'pending')

  async function handleAccept(suggestion) {
    if (busyId) return
    setBusyId(suggestion.id)
    const res = await apiFetch(`/api/suggestions/${suggestion.id}/accept`, {
      method: 'POST',
      token: true,
    })
    setBusyId(null)

    if (!res.ok) {
      onToast?.(
        extractErrorDetail(res.data, 'Não foi possível aceitar a sugestão')
      )
      return
    }

    await load()
    onToast?.(
      `Candidatura atualizada com a memória de @${suggestion.author_username}`
    )
  }

  async function handleReject(suggestion) {
    if (busyId) return
    setBusyId(suggestion.id)
    const res = await apiFetch(`/api/suggestions/${suggestion.id}/reject`, {
      method: 'POST',
      token: true,
    })
    setBusyId(null)

    if (!res.ok) {
      onToast?.(
        extractErrorDetail(res.data, 'Não foi possível recusar a sugestão')
      )
      return
    }

    await load()
    onToast?.('Sugestão recusada')
  }

  return (
    <section className="bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg flex flex-col gap-4">
      {/* ---- Cabeçalho + refresh manual ---- */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary mb-0.5">
            <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
            <span className="text-label-sm uppercase tracking-widest font-bold">Caixa de Entrada</span>
          </div>
          <h3 className="font-serif font-bold text-headline-sm text-on-surface">Sugestões Recebidas</h3>
          <p className="font-sans text-body-sm text-on-surface-variant mt-0.5">
            Alguém lembrou de uma situação por você. Aceitar substitui o pitch da sua candidatura nesta categoria.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          title="Atualizar sugestões"
          className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors shrink-0 disabled:opacity-40"
        >
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      {/* ---- Loading (esqueleto) ---- */}
      {loading ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          <div className="h-28 rounded-2xl bg-surface-container-high/60 animate-pulse" />
          <div className="h-20 rounded-2xl bg-surface-container-high/40 animate-pulse" />
        </div>
      ) : pending.length === 0 && history.length === 0 ? (
        /* ---- Vazio ---- */
        <div className="rounded-xl bg-surface-container/60 p-6 text-center">
          <span className="material-symbols-outlined text-outline text-[28px]">inbox</span>
          <p className="font-sans text-body-sm text-on-surface-variant mt-1">
            Nenhuma sugestão recebida — ninguém lembrou de nada por você ainda.
          </p>
        </div>
      ) : (
        <>
          {/* ---- Pendentes ---- */}
          {pending.length > 0 ? (
            <div className="flex flex-col gap-3">
              {pending.map((s) => (
                <article
                  key={s.id}
                  className="relative rounded-xl bg-surface-container/75 p-4 shadow-md overflow-hidden"
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />

                  <div className="flex items-start justify-between gap-3 relative z-10 mb-2">
                    <div className="min-w-0">
                      <p className="font-sans text-body-sm text-on-surface">
                        <span className="text-primary font-semibold">@{s.author_username}</span> lembrou disso por você
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[16px]">{s.category_emoji}</span>
                        <span className="font-serif font-bold text-title-md text-on-surface truncate">
                          {s.category_title}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-sm text-label-sm">
                      Pendente
                    </span>
                  </div>

                  <div className="relative bg-surface-container-lowest/80 rounded-lg p-3 my-3">
                    <p className="font-sans text-body-sm text-on-surface italic leading-relaxed">
                      {s.pitch}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 relative z-10">
                    <button
                      type="button"
                      onClick={() => handleReject(s)}
                      disabled={busyId === s.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-sans font-semibold text-body-sm transition-colors disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      Recusar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAccept(s)}
                      disabled={busyId === s.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-body-sm shadow-[0_0_16px_rgba(212,175,55,0.3)] hover:shadow-[0_0_24px_rgba(212,175,55,0.5)] transition-all disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      {busyId === s.id ? 'Processando...' : 'Aceitar e substituir'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-surface-container/60 p-4 text-center">
              <p className="font-sans text-body-sm text-on-surface-variant">
                Nenhuma sugestão pendente — ninguém lembrou de nada por você ainda.
              </p>
            </div>
          )}

          {/* ---- Histórico colapsado (aceitas/recusadas antigas) ---- */}
          {history.length > 0 && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="flex items-center justify-between gap-2 px-2 py-1 text-label-sm uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  Histórico ({history.length})
                </span>
                <span className="material-symbols-outlined text-[18px]">
                  {showHistory ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {showHistory && (
                <ul className="flex flex-col gap-1.5">
                  {history.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-surface-container/50 px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="font-sans text-body-sm text-on-surface truncate block">
                          {s.category_emoji} {s.category_title}
                        </span>
                        <span className="font-sans text-[11px] text-outline">
                          @{s.author_username} • {formatDecision(s.decided_at)}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                          s.status === 'accepted'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {s.status === 'accepted' ? 'Aceita' : 'Recusada'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
