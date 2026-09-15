import { useCallback, useState } from 'react'
import { MOCK_CATEGORIES } from '../data/mockAdmin'
import useAuth from './useAuth'

/**
 * useBallot — lógica completa de la cédula de votación (mock, sin backend).
 *
 * Estado local de selección + persistencia en localStorage:
 *   - pg_votes      → { [categoryId]: nomineeId } (votos sellados)
 *   - pg_votes_meta → { hash, at } (metadatos del sello)
 *   - pg_reveal_at  → fecha ISO de cierre de urnas (agendada por el admin)
 *
 * Reglas de negocio cubiertas:
 *   1. 1 voto por categoría (selection map garantiza unicidad).
 *   2. Auto-voto bloqueado vía isSelfVote → card disabled.
 *   3. Voto en blanco permitido (categoría sin selección = null).
 *   4. Cambio de voto permitido ANTES de sellar; tras sellar, bloqueado (hasSealed).
 *   5. Persistencia en pg_votes + pg_votes_meta.
 *   6. Urnas cerradas si pg_reveal_at < now.
 *
 * ADR-0001 (gotcha): la selección es estado local del hook — nunca se muta
 * MOCK_CATEGORIES (single source of truth compartida con el panel admin).
 */

const VOTES_KEY = 'pg_votes'
const META_KEY = 'pg_votes_meta'
const REVEAL_KEY = 'pg_reveal_at'

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Normaliza un handle/username: quita '@', minúsculas y trim. */
export function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/^@/, '')
}

/** Hash fake notarial: #GALA-2025-XXXXXX (6 hex aleatorios). */
function generateHash() {
  const hex = Array.from({ length: 6 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('')
  return `#GALA-2025-${hex}`
}

/** true si pg_reveal_at existe y es una fecha en el pasado (urnas cerradas). */
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

export default function useBallot() {
  const { user } = useAuth()
  const username = user?.username || ''

  // Selección local (voto en blanco = categoría sin selección / null).
  const [selection, setSelection] = useState({})

  // Votos ya sellados (leídos de localStorage al montar).
  const [sealedVotes, setSealedVotes] = useState(() => readJSON(VOTES_KEY) || {})
  const [sealedMeta, setSealedMeta] = useState(() => readJSON(META_KEY) || { hash: null, at: null })

  // true si pg_votes existe y no está vacío.
  const hasSealed = Object.keys(sealedVotes).length > 0

  /**
   * Selecciona/deselecciona un indicado en una categoría.
   * Clic en el ya seleccionado → deselecciona (permite cambiar antes de sellar).
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

  /** true si el indicado es el propio usuario (auto-voto bloqueado). */
  const isSelfVote = useCallback((nominee) => {
    return normalize(username) === normalize(nominee.handle)
  }, [username])

  const progress = {
    selected: Object.values(selection).filter(Boolean).length,
    total: MOCK_CATEGORIES.length,
  }

  /** Sella los votos: genera hash fake, persiste pg_votes + pg_votes_meta. */
  const sealVotes = useCallback(() => {
    const hash = generateHash()
    const at = new Date().toISOString()
    localStorage.setItem(VOTES_KEY, JSON.stringify(selection))
    localStorage.setItem(META_KEY, JSON.stringify({ hash, at }))
    setSealedVotes(selection)
    setSealedMeta({ hash, at })
    return { success: true, hash }
  }, [selection])

  /** Limpia solo la selección local (no toca los votos sellados). */
  const resetSelection = useCallback(() => {
    setSelection({})
  }, [])

  return {
    categories: MOCK_CATEGORIES,
    selection,
    hasSealed,
    sealedVotes,
    sealedMeta,
    toggleSelection,
    isSelfVote,
    progress,
    sealVotes,
    resetSelection,
    isClosed: computeIsClosed(),
  }
}