import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import useAuth from './useAuth'
import { apiFetch } from '../utils/api'

/**
 * useGalaEvents — dono ÚNICO do stream SSE da gala (ADR-0003).
 *
 * Um só EventSource para a app inteira: nada de abrir streams múltiplos.
 * Ciclo de vida:
 *   1. Autenticado? → POST /api/events/ticket (JWT no header) → ticket de 60s
 *   2. EventSource('/api/events?ticket=...') — o ticket é consumido no handshake
 *   3. On open: resync via GET /api/ceremony/position + GET /api/chat/recent
 *   4. On error: fecha, re-pede ticket e reabre (o ticket é de USO ÚNICO, então
 *      o auto-reconnect nativo do EventSource reutilizaria a URL morta — por
 *      isso controlamos a reconexão manualmente)
 *   5. Logout → desconecta e limpa
 *
 * Eventos consumidos (payloads tipados do backend):
 *   state.change  → espelho de /api/state
 *   votes.counter → { total }
 *   ceremony.step → { phase, category_id, revealed, revealed_order? }
 *   chat.message  → { id, username, text, created_at }
 *
 * Expõe: { status, ceremony, totals, chat, onEvent, sendMessage }
 */

const GalaEventsContext = createContext(null)

/** Estado da cerimônia padrão (não iniciada). */
const CERIMONIA_NAO_INICIADA = { phase: null, category_id: null, revealed: [], revealed_order: null }

export function GalaEventsProvider({ children }) {
  const { isAuthenticated } = useAuth()

  const [status, setStatus] = useState('offline') // offline | conectando | conectado | reconectando
  const [ceremony, setCeremony] = useState(CERIMONIA_NAO_INICIADA)
  const [totals, setTotals] = useState(null) // { totalVotos, totalUsers, totalCandidatos, votacaoAberta, revealAt }
  const [chat, setChat] = useState([])

  const esRef = useRef(null)
  const timerRef = useRef(null)
  const listenersRef = useRef(new Set())
  const generationRef = useRef(0) // geração da conexão: invalida callbacks órfãos

  /** Assinatura de eventos crus (quem quiser reagir a um tipo específico). */
  const onEvent = useCallback((cb) => {
    listenersRef.current.add(cb)
    return () => listenersRef.current.delete(cb)
  }, [])

  /** Aplica um evento ao estado do provider + re-transmite aos assinantes. */
  const handleEvent = useCallback((evt) => {
    listenersRef.current.forEach((cb) => {
      try {
        cb(evt)
      } catch (err) {
        console.error('[useGalaEvents] Erro em assinante de evento', err)
      }
    })

    switch (evt.type) {
      case 'state.change':
        // Espelho de /api/state: alimentar totais ao vivo (landing etc.).
        setTotals({
          votacaoAberta: evt.payload.votacao_aberta !== false,
          revealAt: evt.payload.reveal_at ?? null,
          totalVotos: evt.payload.total_votos ?? null,
          totalUsers: evt.payload.total_users ?? null,
          totalCandidatos: evt.payload.total_candidatos ?? null,
        })
        break
      case 'votes.counter':
        setTotals((prev) => ({ ...(prev || {}), totalVotos: evt.payload.total }))
        break
      case 'ceremony.step': {
        const revealedOrder = typeof evt.payload.revealed_order === 'number' ? evt.payload.revealed_order : null
        setCeremony({
          phase: evt.payload.phase ?? null,
          category_id: evt.payload.category_id ?? null,
          revealed: Array.isArray(evt.payload.revealed) ? evt.payload.revealed : [],
          revealed_order: revealedOrder,
        })
        break
      }
      case 'chat.message': {
        const msg = evt.payload
        setChat((prev) => {
          // Dedupe: o próprio remetente também recebe o broadcast — nunca duplica.
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        break
      }
      default:
        break
    }
  }, [])

  /** Resync completo (chamado a cada abertura de stream): posições + chat. */
  const resync = useCallback(async (gen) => {
    const [posRes, chatRes] = await Promise.all([
      apiFetch('/api/ceremony/position'),
      apiFetch('/api/chat/recent', { token: true }),
    ])
    if (generationRef.current !== gen) return // conexão morreu enquanto resyncava
    if (posRes.ok && posRes.data) {
      setCeremony({
        phase: posRes.data.phase ?? null,
        category_id: posRes.data.category_id ?? null,
        revealed: Array.isArray(posRes.data.revealed) ? posRes.data.revealed : [],
        revealed_order: null,
      })
    }
    if (chatRes.ok && Array.isArray(chatRes.data)) {
      setChat(chatRes.data)
    }
  }, [])

  /** Abre o stream: ticket novo → EventSource. Reconexão é SEMPRE manual. */
  const openStream = useCallback((gen) => {
    let cancelled = false
    ;(async () => {
      const ticketRes = await apiFetch('/api/events/ticket', { method: 'POST', token: true })
      if (cancelled || generationRef.current !== gen) return
      if (!ticketRes.ok || !ticketRes.data?.ticket) {
        // Sessão inválida ou backend fora: backoff e tenta de novo (se ainda autenticado).
        setStatus('offline')
        timerRef.current = setTimeout(() => {
          if (generationRef.current === gen) openStream(gen)
        }, 5000)
        return
      }
      setStatus('conectando')
      const es = new EventSource(`/api/events?ticket=${encodeURIComponent(ticketRes.data.ticket)}`)
      esRef.current = es

      es.onopen = () => {
        if (generationRef.current !== gen) return
        setStatus('conectado')
        resync(gen)
      }
      es.onmessage = (e) => {
        if (generationRef.current !== gen) return
        try {
          handleEvent(JSON.parse(e.data))
        } catch (err) {
          console.error('[useGalaEvents] Evento SSE malformado', err)
        }
      }
      es.onerror = () => {
        if (generationRef.current !== gen) return
        // Ticket consumido + URL morta: fechar SEMPRE (o auto-reconnect nativo
        // do EventSource bateria 401 para sempre).
        es.close()
        esRef.current = null
        setStatus('reconectando')
        timerRef.current = setTimeout(() => {
          if (generationRef.current === gen) openStream(gen)
        }, 2000)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [handleEvent, resync])

  // Conecta ao autenticar; desconecta ao sair.
  useEffect(() => {
    if (!isAuthenticated) {
      generationRef.current += 1
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      if (timerRef.current) clearTimeout(timerRef.current)
      setStatus('offline')
      setCeremony(CERIMONIA_NAO_INICIADA)
      setChat([])
      setTotals(null)
      return undefined
    }
    const gen = ++generationRef.current
    openStream(gen)
    return () => {
      generationRef.current += 1
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isAuthenticated, openStream])

  /** Envia mensagem pelo caminho REST (nunca pelo stream). O broadcast do
   * servidor traz a mensagem de volta para todos — inclusive o remetente. */
  const sendMessage = useCallback(async (text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed) return { success: false, error: 'Mensagem vazia' }
    const res = await apiFetch('/api/chat', { method: 'POST', body: { text: trimmed }, token: true })
    if (!res.ok) {
      const detail = typeof res.data?.detail === 'string' ? res.data.detail : ''
      if (res.status === 401) return { success: false, error: 'Sessão expirada: entre na gala novamente' }
      return { success: false, error: detail || 'Falha ao enviar mensagem' }
    }
    return { success: true }
  }, [])

  /** Resync sob demanda (páginas que acabaram de montar e querem o estado
   * do palco AGORA, sem esperar o próximo evento do stream). */
  const refresh = useCallback(() => {
    resync(generationRef.current)
  }, [resync])

  return (
    <GalaEventsContext.Provider value={{ status, ceremony, totals, chat, onEvent, sendMessage, refresh }}>
      {children}
    </GalaEventsContext.Provider>
  )
}

export default function useGalaEvents() {
  const ctx = useContext(GalaEventsContext)
  if (!ctx) throw new Error('useGalaEvents fora do GalaEventsProvider (monte no App.jsx dentro do AuthProvider)')
  return ctx
}
