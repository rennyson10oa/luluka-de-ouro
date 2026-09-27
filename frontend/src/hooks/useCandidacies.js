import { useCallback, useEffect, useState } from 'react'
import apiFetch from '../utils/api'
import { MAX_CANDIDACIES } from '../data/mockProfile'
import useAuth from './useAuth'
import useGalaState from './useGalaState'

/**
 * useCandidacies — dossiê real de candidaturas do usuário (Fase 2, ADR-0002).
 *
 * Não existem endpoints GET próprios de "minhas candidaturas": o dossiê é
 * derivado de GET /api/categories, filtrando as candidacies cujo user_id é o
 * usuário logado. Escrita via POST /api/candidacies e PUT /api/candidacies/{id}.
 *
 * O protocolo (#XXX-2025-NN) NÃO existe no servidor — é gerado localmente e
 * determinístico por candidacy.id apenas para exibição (pendência de Fase 3).
 * O `status` também não vem da API: o dossiê real nasce como 'em_disputa'.
 *
 * Estrutura do item (mesmo shape consumido por CandidacyPage/MyCandidacies):
 *   { id, protocol, categoryId, categoryTitle, categoryEmoji, pitch, status, createdAt }
 */

/** Palavras de ligação ignoradas ao gerar as iniciais do protocolo. */
const STOPWORDS = new Set([
  'com', 'de', 'do', 'da', 'dos', 'das', 'o', 'a', 'os', 'as',
  'e', 'para', 'por', 'em', 'no', 'na', 'um', 'uma',
])

/** Descrição genérica: a API não expõe a descrição da categoria. */
const CATEGORY_DESCRIPTION_FALLBACK =
  'Categoria oficial da gala. Mostre por que você merece este troféu.'

/**
 * Gera o protocolo de DISPLAY: '#' + até 3 iniciais da categoria + '-2025-' +
 * 2 dígitos derivados do id da candidatura (estável entre refetches).
 */
function buildProtocol(categoryTitle, seed) {
  const initials = String(categoryTitle || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOPWORDS.has(word.toLowerCase()))
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
  const numericSeed = Number.isFinite(Number(seed)) ? Number(seed) : 0
  const digits = String(Math.abs(numericSeed) % 100).padStart(2, '0')
  return `#${initials || 'GAL'}-2025-${digits}`
}

/** Mapeia uma candidacy do backend para o item de exibição da urna. */
function mapCandidacy(cand, category) {
  return {
    // id do servidor — usado no PUT /api/candidacies/{id}.
    id: cand.id,
    protocol: buildProtocol(category.title, cand.id),
    categoryId: category.id,
    categoryTitle: category.title,
    categoryEmoji: category.emoji,
    pitch: cand.pitch,
    // Não há status no backend: dossiê real entra em disputa.
    status: 'em_disputa',
    // A API não expõe createdAt; CandidacyCard degrada para '--:--'.
    createdAt: null,
  }
}

/** Converte o `detail` EN do backend em mensagem pt-BR da urna. */
function mapCandidacyError(status, detail) {
  const text = String(detail || '')
  if (status === 400 && text.includes('Limit of 4')) {
    return 'Limite de candidaturas atingido: o dossiê está completo'
  }
  if (status === 400 && text.includes('Already a candidate')) {
    return 'Você já tem candidatura registrada nesta categoria'
  }
  if (status === 403) {
    return 'Votação encerrada'
  }
  if (status === 401) {
    return 'Sessão expirada: entre na gala novamente'
  }
  return 'Falha na comunicação com o cartório'
}

export default function useCandidacies() {
  const { user } = useAuth()
  const userId = user?.id
  // Fechamento das urnas vem do servidor (substitui o antigo pg_reveal_at).
  const { isClosed } = useGalaState()

  // Categorias completas da gala (para as "Vagas Abertas" e para a descrição).
  const [allCategories, setAllCategories] = useState(null)
  // Dossiê do usuário (array de itens de exibição).
  const [candidacies, setCandidacies] = useState([])

  const load = useCallback(async () => {
    const res = await apiFetch('/api/categories')
    if (!res.ok || !Array.isArray(res.data)) {
      console.error('[useCandidacies] Falha ao carregar /api/categories', res.status)
      setAllCategories([])
      setCandidacies([])
      return
    }

    setAllCategories(
      res.data.map((cat) => ({
        id: cat.id,
        title: cat.title,
        emoji: cat.emoji,
        description: CATEGORY_DESCRIPTION_FALLBACK,
      }))
    )

    // Sem identidade hidratada ainda: dossiê vazio (evita vazar de outro usuário).
    if (!Number.isInteger(userId)) {
      setCandidacies([])
      return
    }

    const mine = []
    res.data.forEach((cat) => {
      ;(cat.candidacies || []).forEach((cand) => {
        if (cand.user_id === userId) mine.push(mapCandidacy(cand, cat))
      })
    })
    setCandidacies(mine)
  }, [userId])

  // Carrega no mount e re-consulta sempre que a identidade mudar.
  useEffect(() => {
    load()
  }, [load])

  const usedCount = candidacies.length
  const remaining = Math.max(0, MAX_CANDIDACIES - usedCount)

  // Categorias sem candidatura do usuário (por categoryId) = "Vagas abertas".
  const usedCategoryIds = new Set(candidacies.map((c) => c.categoryId))
  const openCategories = (allCategories || []).filter((cat) => !usedCategoryIds.has(cat.id))

  /** Registra nova candidatura (POST). Valida o que dá para validar no cliente. */
  const addCandidacy = useCallback(
    async (category, pitch) => {
      const trimmed = String(pitch || '').trim()
      if (remaining <= 0) {
        return { success: false, error: 'Limite de candidaturas atingido: o dossiê está completo' }
      }
      if (trimmed.length < 1 || trimmed.length > 280) {
        return { success: false, error: 'O pitch deve ter entre 1 e 280 caracteres' }
      }
      if (candidacies.some((c) => c.categoryId === category.id)) {
        return { success: false, error: 'Você já tem candidatura registrada nesta categoria' }
      }

      const res = await apiFetch('/api/candidacies', {
        method: 'POST',
        body: { category_id: category.id, pitch: trimmed },
        token: true,
      })

      if (!res.ok || !res.data) {
        return {
          success: false,
          error: mapCandidacyError(res.status, res.data?.detail),
        }
      }

      // 201 → merge do item novo na lista local (sem refetch).
      setCandidacies((prev) => [...prev, mapCandidacy(res.data, category)])
      return { success: true }
    },
    [candidacies, remaining]
  )

  /** Retifica o pitch de uma candidatura existente (PUT). */
  const updatePitch = useCallback(async (id, pitch) => {
    const trimmed = String(pitch || '').trim()
    if (trimmed.length < 1 || trimmed.length > 280) {
      return { success: false, error: 'O pitch deve ter entre 1 e 280 caracteres' }
    }

    const res = await apiFetch(`/api/candidacies/${id}`, {
      method: 'PUT',
      body: { pitch: trimmed },
      token: true,
    })

    if (!res.ok || !res.data) {
      const detail = res.data?.detail
      if (res.status === 403 && String(detail || '').includes('Not authorized')) {
        return { success: false, error: 'Não autorizado a editar este pitch' }
      }
      return { success: false, error: mapCandidacyError(res.status, detail) }
    }

    // Merge do pitch retificado na lista local.
    setCandidacies((prev) => prev.map((c) => (c.id === id ? { ...c, pitch: res.data.pitch } : c)))
    return { success: true }
  }, [])

  /** Texto pronto para compartilhar no Zap. */
  const shareText = useCallback((candidacy) => {
    return `Vote em mim para ${candidacy.categoryTitle} na Gala do Grupo! 🏆 Meu pitch: "${candidacy.pitch}" ${candidacy.protocol}`
  }, [])

  return {
    candidacies,
    maxCandidacies: MAX_CANDIDACIES,
    usedCount,
    remaining,
    openCategories,
    addCandidacy,
    updatePitch,
    isClosed,
    shareText,
  }
}
