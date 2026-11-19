import { useCallback, useEffect, useMemo, useState } from 'react'
import apiFetch from '../utils/api'

/**
 * useGalaState — fonte única de verdade dos estados globais da gala.
 *
 * Fase 2 (ADR-0002): substitui TODA leitura de localStorage.getItem('pg_reveal_at')
 * do projeto por GET /api/state (sem auth). O cartório é quem manda no relógio:
 * `votacao_aberta`, `reveal_at`, `total_votos` e os contadores da gala.
 *
 * Regras de hidratação:
 *   - enquanto carrega, assume `votacaoAberta=true` e `isClosed=false` para NÃO
 *     trancar a cédula por causa de um flash de rede;
 *   - `isClosed` = reveal_at existe E o relógio local já passou dele;
 *   - o setTimeout abaixo dispara no exato momento do reveal para os
 *     consumidores reagirem sem exigir reload (mesmo comportamento do antigo
 *     da Task 11).
 *
 * Retorno: { votacaoAberta, revealAt, isClosed, totalVotos, totalUsers,
 *            totalCandidatos, loading, refresh }
 */

/** Converte ISO em Date válido ou null (nunca devolve Invalid Date). */
function parseReveal(raw) {
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export default function useGalaState(intervalMs) {
  const [state, setState] = useState({
    votacaoAberta: true,
    revealAtRaw: null,
    totalVotos: null,
    totalUsers: null,
    totalCandidatos: null,
    loading: true,
  })
  const [now, setNow] = useState(() => Date.now())

  const refresh = useCallback(async () => {
    const res = await apiFetch('/api/state')
    if (!res.ok || !res.data) {
      // Servidor indisponível: mantém os defaults seguros (urnas abertas).
      console.error('[useGalaState] Não foi possível ler /api/state', res.status)
      setState((prev) => ({ ...prev, loading: false }))
      return
    }
    const d = res.data
    setState({
      votacaoAberta: d.votacao_aberta !== false,
      revealAtRaw: d.reveal_at ?? null,
      totalVotos: typeof d.total_votos === 'number' ? d.total_votos : null,
      totalUsers: typeof d.total_users === 'number' ? d.total_users : null,
      totalCandidatos: typeof d.total_candidatos === 'number' ? d.total_candidatos : null,
      loading: false,
    })
  }, [])

  // Busca uma vez no mount (e sempre que refresh mudar de identidade).
  useEffect(() => {
    refresh()
  }, [refresh])

  // Refresh opcional por polling (só quando o chamador pede um intervalo).
  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return undefined
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, refresh])

  const revealAt = useMemo(() => parseReveal(state.revealAtRaw), [state.revealAtRaw])

  // Ao agendar o reveal no futuro, agenda um tick exatamente no horário para
  // destravar as telas sem reload. `+50ms` evita borda de relógio.
  useEffect(() => {
    if (!revealAt) return undefined
    const ms = revealAt.getTime() - Date.now()
    if (ms <= 0) {
      setNow(Date.now())
      return undefined
    }
    const id = setTimeout(() => setNow(Date.now()), Math.min(ms + 50, 2147483647))
    return () => clearTimeout(id)
  }, [revealAt])

  const isClosed = Boolean(revealAt && now >= revealAt.getTime())

  return {
    votacaoAberta: state.votacaoAberta,
    revealAt,
    isClosed,
    totalVotos: state.totalVotos,
    totalUsers: state.totalUsers,
    totalCandidatos: state.totalCandidatos,
    loading: state.loading,
    refresh,
  }
}
