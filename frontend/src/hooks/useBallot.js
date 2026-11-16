import { useCallback, useEffect, useState } from 'react'
import apiFetch from '../utils/api'
import useAuth from './useAuth'
import useGalaState from './useGalaState'

/**
 * useBallot — lógica da cédula de votação contra o backend REAL (Fase 2).
 *
 * O voto vive só no servidor (POST /api/votes com upsert por categoria). O
 * estado de "selado" SOBREVIVE a reload: a cédula rehidrata de
 * GET /api/votes/me, com selo do servidor (GET /api/votes/me/stamp,
 * determinístico) e horário do registro (created_at de cada voto).
 *
 * Fluxo:
 *   1. GET /api/categories (sem auth) → mapeia para o shape já consumido
 *      pelas telas: { id, title, emoji, modo, description, nominees }.
 *   2. Seleção local (voto em branco = categoria sem seleção / null).
 *   3. sealVotes() → POST /api/votes para CADA seleção não-nula com Bearer.
 *      Se todos os POSTs voltarem ok: marca hasSealed, busca o selo real
 *      (stamp) no cartório e registra o horário.
 *
 * Regras cobertas:
 *   1. 1 voto por categoria (o POST faz upsert server-side).
 *   2. Auto-voto bloqueado no cliente (isSelfVote) — o backend também devolve
 *      403 "Self-voting is not allowed" como defesa em profundidade.
 *   3. Voto em branco permitido (categoria sem seleção = null).
 *   4. Urnas fechadas quando reveal_at passou (via useGalaState).
 */

/** Normaliza um handle/username: remove '@', caixa baixa e espaços. */
export function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/^@/, '')
}

/** Hash fake notarial: #GALA-2025-XXXXXX (6 hex aleatórios) — cosmético. */
function generateHash() {
  const hex = Array.from({ length: 6 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('')
  return `#GALA-2025-${hex}`
}

/**
 * O endpoint /api/categories não expõe descrição da categoria (só title/emoji/
 * modo). Mantemos uma descrição genérica para o CategorySection não renderizar
 * vazio — pendência de conteúdo para a Fase 3.
 */
const CATEGORY_DESCRIPTION_FALLBACK =
  'Disputa oficial da gala. Eleja o indicado mais merecedor desta categoria.'

/** Mapeia a categoria do backend para o shape que as telas da cédula já usam. */
function mapCategory(cat) {
  const candidacies = Array.isArray(cat.candidacies) ? cat.candidacies : []
  return {
    id: cat.id,
    title: cat.title,
    emoji: cat.emoji,
    modo: cat.modo,
    reveal_order: cat.reveal_order,
    description: CATEGORY_DESCRIPTION_FALLBACK,
    nominees: candidacies.map((cand) => ({
      // O id do nominee É o user_id: é ele que o POST /api/votes espera.
      id: cand.user_id,
      handle: `@${cand.username}`,
      name: cand.username,
      pitch: cand.pitch || 'Sem pitch registrado.',
      candidacyId: cand.id,
    })),
  }
}

export default function useBallot() {
  const { user } = useAuth()
  const username = user?.username || ''
  // Fechamento das urnas vem do servidor (substitui o antigo pg_reveal_at).
  const { isClosed } = useGalaState()

  // null enquanto carrega — os consumidores mostram o estado de carregamento.
  const [categories, setCategories] = useState(null)
  const [selection, setSelection] = useState({})
  const [sealedVotes, setSealedVotes] = useState({})
  const [sealedMeta, setSealedMeta] = useState({ hash: null, at: null })

  // Hidratação do selo: GET /api/votes/me devolve as cédulas JÀ registradas
  // pelo eleitor autenticado. Com isso, o estado de "selado" sobrevive a
  // reload e navegação. O SELO também rehidrata: o hash vem do servidor
  // (GET /api/votes/me/stamp — determinístico sobre a cesta) e o horário,
  // do timestamp gravado em cada voto.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await apiFetch('/api/votes/me', { token: true })
      if (cancelled || !res.ok || !Array.isArray(res.data)) return
      if (res.data.length > 0) {
        const hyd = {}
        let maisRecente = null
        res.data.forEach((v) => {
          hyd[v.category_id] = v.voted_user_id
          if (v.voted_at && (!maisRecente || v.voted_at > maisRecente)) maisRecente = v.voted_at
        })
        setSealedVotes(hyd)
        // Selo do servidor cai para cosmético local se o endpoint falhar.
        const stamp = await apiFetch('/api/votes/me/stamp', { token: true })
        if (cancelled) return
        const hash = stamp.ok && stamp.data?.stamp ? stamp.data.stamp : generateHash()
        setSealedMeta({ hash, at: maisRecente })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await apiFetch('/api/categories')
      if (cancelled) return
      if (!res.ok || !Array.isArray(res.data)) {
        console.error('[useBallot] Falha ao carregar /api/categories', res.status)
        setCategories([])
        return
      }
      setCategories(res.data.map(mapCategory))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // hasSealed = houve pelo menos uma categoria selada NESTA sessão.
  const hasSealed = Object.keys(sealedVotes).length > 0

  /**
   * Seleciona/desseleciona um indicado. Clicar no já selecionado desseleciona
   * (permite mudar de ideia antes de selar).
   */
  const toggleSelection = useCallback((categoryId, nomineeId) => {
    setSelection((prev) => {
      const next = { ...prev }
      if (next[categoryId] === nomineeId) {
        next[categoryId] = null
      } else {
        next[categoryId] = nomineeId
      }
      return next
    })
  }, [])

  /** true se o indicado é o próprio usuário (auto-voto bloqueado na UI). */
  const isSelfVote = useCallback(
    (nominee) => {
      return normalize(username) === normalize(nominee.handle)
    },
    [username]
  )

  const progress = {
    selected: Object.values(selection).filter(Boolean).length,
    total: categories?.length ?? 0,
  }

  /**
   * Sela os votos: POST /api/votes para cada seleção não-nula.
   * Retorna { success, hash } ou { success:false, error } — nunca lança.
   */
  const sealVotes = useCallback(async () => {
    const entries = Object.entries(selection).filter(([, votedUserId]) => votedUserId != null)
    if (entries.length === 0) {
      return { success: false, error: 'Selecione ao menos um indicado antes de selar' }
    }

    // Mapa real { [category_id]: voted_user_id } reconstruído a partir do que
    // foi aceito pelo servidor — é o que a tela de selo usa para listar.
    const posted = {}

    for (const [categoryId, votedUserId] of entries) {
      const res = await apiFetch('/api/votes', {
        method: 'POST',
        body: { category_id: Number(categoryId), voted_user_id: Number(votedUserId) },
        token: true,
      })

      if (!res.ok) {
        const detail = typeof res.data?.detail === 'string' ? res.data.detail : ''
        if (res.status === 403 && detail.includes('Self-voting')) {
          return { success: false, error: 'Auto-voto bloqueado: o cartório não aceita votar em você mesmo' }
        }
        if (res.status === 403) {
          return { success: false, error: 'Votação encerrada: as urnas já foram seladas' }
        }
        if (res.status === 401) {
          return { success: false, error: 'Sessão expirada: entre na gala novamente' }
        }
        return { success: false, error: 'Falha na comunicação com o cartório' }
      }

      posted[Number(categoryId)] = Number(votedUserId)
    }

    // Selo notarial REAL: hash calculado no servidor sobre a cesta registrada
    // (GET /api/votes/me/stamp). Fallback: hash cosmético local se o cartório
    // não responder — a cédula nunca fica sem selo.
    const stampRes = await apiFetch('/api/votes/me/stamp', { token: true })
    const hash = stampRes.ok && stampRes.data?.stamp ? stampRes.data.stamp : generateHash()

    const at = new Date().toISOString()
    // Mantém o shape consumido pela tela de selo (sealedVotes[cat.id] → user_id),
    // reconstruído a partir dos POSTs aceitos pelo servidor.
    setSealedVotes(posted)
    setSealedMeta({ hash, at })
    return { success: true, hash }
  }, [selection])

  /** Limpa apenas a seleção local (não toca os votos já selados). */
  const resetSelection = useCallback(() => {
    setSelection({})
  }, [])

  return {
    categories,
    selection,
    hasSealed,
    sealedVotes,
    sealedMeta,
    toggleSelection,
    isSelfVote,
    progress,
    sealVotes,
    resetSelection,
    isClosed,
  }
}
