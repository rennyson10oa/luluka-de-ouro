import { useEffect, useRef, useState } from 'react'
import useGalaEvents from '../../hooks/useGalaEvents'

/**
 * RevealChat — chat AO VIVO REAL da cerimônia (ADR-0003).
 *
 * As mensagens chegam pelo stream único (useGalaEvents) e o envio vai por
 * REST (POST /api/chat) — o broadcast do servidor traz a própria mensagem
 * de volta, já deduplicada por id no provider.
 *
 * Props:
 *   active  — chat habilitado (cerimônia aberta); enquanto fechado, só leitura.
 *   currentUser — { username } para destacar as mensagens do próprio usuário.
 */

export default function RevealChat({ active, currentUser }) {
  const { chat, sendMessage, status, online } = useGalaEvents()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)

  // Auto-scroll para a última mensagem.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.length])

  async function handleSend(e) {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    setError('')
    const res = await sendMessage(draft)
    if (res.success) {
      setDraft('')
    } else {
      setError(res.error)
    }
    setSending(false)
  }

  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-xl rounded-2xl p-4 border border-outline-variant/30 flex flex-col h-[480px]">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <span
          className={`w-2 h-2 rounded-full animate-pulse ${status === 'conectado' ? 'bg-emerald-400' : 'bg-error'}`}
        />
        <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">
          {status === 'conectado' ? 'Chat ao vivo do cartório' : 'Reconectando ao cartório...'}
        </span>
        {/* Presença ao vivo (presence.update do hub): cada aba = 1 conexão. */}
        {status === 'conectado' && online > 0 && (
          <span
            title="Pessoas conectadas ao palco agora"
            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high/80 border border-outline-variant/40 text-outline font-sans font-bold text-[10px] font-mono"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {online}
          </span>
        )}
      </div>

      {/* Histórico (GET /api/chat/recent + eventos chat.message) */}
      <ul ref={listRef} className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 min-h-0">
        {chat.length === 0 && (
          <li className="font-sans text-body-sm text-outline italic p-2">
            Silêncio na gala — seja quem estrear o chat.
          </li>
        )}
        {chat.map((msg) => {
          const mine = currentUser?.username && msg.username === currentUser.username
          return (
            <li
              key={msg.id}
              className={`p-2.5 rounded-lg transition-opacity duration-500 ${
                mine ? 'bg-primary/10 border border-primary/20' : 'bg-surface-container-low/70'
              }`}
            >
              <span className="font-sans font-semibold text-body-sm text-secondary">@{msg.username}: </span>
              <span className="font-sans text-body-sm text-on-surface-variant break-words">{msg.text}</span>
            </li>
          )
        })}
      </ul>

      {/* Envio por REST (POST /api/chat) */}
      <form onSubmit={handleSend} className="flex items-center gap-2 mt-3 shrink-0">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={280}
          disabled={!active || sending}
          placeholder={active ? 'Manda a real...' : 'Chat libera quando a cerimônia abre'}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-sans text-body-sm placeholder:text-outline focus:outline-none focus:border-primary/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!active || sending || !draft.trim()}
          className="shrink-0 w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>
      {error && (
        <p className="font-sans text-[11px] text-error mt-1 shrink-0">{error}</p>
      )}
    </div>
  )
}
