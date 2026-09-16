import { useCallback, useState } from 'react'
import { MOCK_CATEGORIES } from '../data/mockAdmin'
import { MOCK_MY_CANDIDACIES, MAX_CANDIDACIES } from '../data/mockProfile'

/**
 * useCandidacies — store mock compartilhado de candidaturas do usuário.
 *
 * Persistência em localStorage (chave pg_candidacies), compartilhada entre
 * a Urna de Candidaturas (/candidaturas) e o Perfil (MyCandidacies).
 *
 * Estrutura do item:
 *   { id, protocol, categoryId, categoryTitle, categoryEmoji, pitch, status, createdAt }
 *   status: 'em_disputa' | 'homologada'
 *
 * Regras de negócio:
 *   1. Máx. MAX_CANDIDACIES (4) candidaturas ativas.
 *   2. 1 candidatura por categoria (openCategories some ao registrar).
 *   3. Pitch entre 1 e 280 caracteres.
 *   4. Edição bloqueada se pg_reveal_at passou (isClosed).
 *
 * ADR-0001 (gotcha): o store é dono dos próprios dados — NUNCA muta
 * MOCK_CATEGORIES (fonte única compartilhada com a cédula e o admin).
 */

const STORAGE_KEY = 'pg_candidacies'
const REVEAL_KEY = 'pg_reveal_at'

/** Palavras de ligação ignoradas ao gerar as iniciais do protocolo. */
const STOPWORDS = new Set([
  'com', 'de', 'do', 'da', 'dos', 'das', 'o', 'a', 'os', 'as',
  'e', 'para', 'por', 'em', 'no', 'na', 'um', 'uma',
])

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** true se pg_reveal_at existe e é uma data no passado (urnas fechadas). */
function computeIsClosed() {
  try {
    const saved = localStorage.getItem(REVEAL_KEY)
    if (!saved) return false
    const d = new Date(saved)
    return !Number.isNaN(d.getTime()) && d.getTime() < Date.now()
  } catch {
    return false
  }
}

/**
 * Casa o título do mockProfile com o título canônico de MOCK_CATEGORIES
 * (case-insensitive + contains nos dois sentidos). Ex.:
 *   'Membro com Mais Mitadas' → casa direto;
 *   'Mais Pataquadas do Ano' → casa com 'Membro com Mais Pataquadas do Ano'.
 */
function findCategoryByTitle(title) {
  const needle = String(title || '').trim().toLowerCase()
  if (!needle) return null
  return (
    MOCK_CATEGORIES.find((cat) => cat.title.toLowerCase().includes(needle)) ||
    MOCK_CATEGORIES.find((cat) => needle.includes(cat.title.toLowerCase())) ||
    null
  )
}

/**
 * Seed inicial: primeira leitura com storage vazio → semeia a partir de
 * MOCK_MY_CANDIDACIES, usando os títulos canônicos de MOCK_CATEGORIES.
 * Status derivado do protocolo: MIT → 'em_disputa', PAT → 'homologada'.
 */
function buildSeed() {
  return MOCK_MY_CANDIDACIES.map((mock, index) => {
    const category = findCategoryByTitle(mock.category)
    return {
      id: `seed-${index + 1}`,
      protocol: mock.protocol,
      categoryId: category ? category.id : null,
      categoryTitle: category ? category.title : mock.category,
      categoryEmoji: category ? category.emoji : mock.emoji,
      pitch: mock.pitch,
      status: mock.protocol.startsWith('#MIT') ? 'em_disputa' : 'homologada',
      createdAt: '2025-09-01T02:47:00.000Z',
    }
  })
}

/** Gera o protocolo: '#' + 3 letras da categoria + '-2025-' + 2 dígitos. */
function buildProtocol(categoryTitle) {
  const initials = categoryTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOPWORDS.has(word.toLowerCase()))
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
  const digits = String(Math.floor(Math.random() * 100)).padStart(2, '0')
  return `#${initials}-2025-${digits}`
}

export default function useCandidacies() {
  // Estado inicial: lê do storage; se vazio, semeia a partir do mockProfile.
  const [candidacies, setCandidacies] = useState(() => {
    const saved = readJSON(STORAGE_KEY)
    if (Array.isArray(saved)) return saved
    const seed = buildSeed()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    } catch {
      // storage indisponível → segue só em memória
    }
    return seed
  })

  const usedCount = candidacies.length
  const remaining = Math.max(0, MAX_CANDIDACIES - usedCount)

  // Categorias sem candidatura do usuário (por categoryId) = "Vagas abertas".
  const usedCategoryIds = new Set(candidacies.map((c) => c.categoryId))
  const openCategories = MOCK_CATEGORIES.filter((cat) => !usedCategoryIds.has(cat.id))

  /** Registra uma nova candidatura. Valida limite, faixa do pitch e unicidade por categoria. */
  const addCandidacy = useCallback(
    (category, pitch) => {
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
      const item = {
        id: `cand-${Date.now()}`,
        protocol: buildProtocol(category.title),
        categoryId: category.id,
        categoryTitle: category.title,
        categoryEmoji: category.emoji,
        pitch: trimmed,
        status: 'em_disputa',
        createdAt: new Date().toISOString(),
      }
      const next = [...candidacies, item]
      setCandidacies(next)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // storage indisponível → segue só em memória
      }
      return { success: true }
    },
    [candidacies, remaining]
  )

  /** Retifica o pitch de uma candidatura existente (valida 1..280). */
  const updatePitch = useCallback(
    (id, pitch) => {
      const trimmed = String(pitch || '').trim()
      if (trimmed.length < 1 || trimmed.length > 280) {
        return { success: false, error: 'O pitch deve ter entre 1 e 280 caracteres' }
      }
      const next = candidacies.map((c) => (c.id === id ? { ...c, pitch: trimmed } : c))
      setCandidacies(next)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // storage indisponível → segue só em memória
      }
      return { success: true }
    },
    [candidacies]
  )

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
    isClosed: computeIsClosed(),
    shareText,
  }
}