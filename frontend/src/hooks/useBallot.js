import { useCallback, useEffect, useState } from 'react'
import { MOCK_CATEGORIES } from '../data/mockAdmin'
import useAuth from './useAuth'
import { scopedKey } from '../utils/userScope'

/**
 * useBallot — lógica completa da cédula de votação (mock, sem backend).
 *
 * Estado local de seleção + persistência em localStorage COM ESCOPO DO
 * ELEITOR (pg_votes:u<id>) — votos são do eleitor, não da gala. Sem o
 * escopo, o usuário B herdava a cédula selada do usuário A (bug corrigido
 * na verificação da Task 6).
 *
 *   - pg_votes:u<id>      → { [categoryId]: nomineeId } (votos selados)
 *   - pg_votes_meta:u<id> → { hash, at } (metadados do selo)
 *   - pg_reveal_at        → data ISO de fechamento (GLOBAL — config da gala)
 *
 * Regras de negócio cobertas:
 *   1. 1 voto por categoria (selection map garante unicidade).
 *   2. Auto-voto bloqueado via isSelfVote → card disabled.
 *   3. Voto em branco permitido (categoria sem seleção = null).
 *   4. Mudança de voto permitida ANTES de selar; após selar, bloqueada (hasSealed).
 *   5. Persistência por usuário em pg_votes:u<id> + pg_votes_meta:u<id>.
 *   6. Urnas fechadas se pg_reveal_at < now.
 *
 * ADR-0001 (gotcha): a seleção é estado local do hook — nunca se muta
 * MOCK_CATEGORIES (single source of truth compartilhada com o painel admin).
 */

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

  // Chaves com escopo do eleitor. Durante a hidratação do useAuth (sem id
  // ainda) o escopo é 'anon' — chave vazia por definição, sem flash de
  // estado alheio. O useEffect abaixo re-sincroniza quando o id chega.
  const votesKey = scopedKey('pg_votes', user)
  const metaKey = scopedKey('pg_votes_meta', user)

  // Seleção local (voto em branco = categoria sem seleção / null).
  const [selection, setSelection] = useState({})

  // Votos já selados (lidos do storage com escopo ao montar).
  const [sealedVotes, setSealedVotes] = useState(() => readJSON(votesKey) || {})
  const [sealedMeta, setSealedMeta] = useState(() => readJSON(metaKey) || { hash: null, at: null })

  // Re-sincroniza o selo quando a identidade muda (hidratação do useAuth
  // preenche o id depois do 1º render; troca de usuário sem remount).
  useEffect(() => {
    setSealedVotes(readJSON(votesKey) || {})
    setSealedMeta(readJSON(metaKey) || { hash: null, at: null })
  }, [votesKey, metaKey])

  // true se pg_votes:u<id> existe e não está vazio.
  const hasSealed = Object.keys(sealedVotes).length > 0

  /**
   * Seleciona/desseleciona um indicado em uma categoria.
   * Clicar no já selecionado → desseleciona (permite mudar antes de selar).
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

  /** true se o indicado é o próprio usuário (auto-voto bloqueado). */
  const isSelfVote = useCallback((nominee) => {
    return normalize(username) === normalize(nominee.handle)
  }, [username])

  const progress = {
    selected: Object.values(selection).filter(Boolean).length,
    total: MOCK_CATEGORIES.length,
  }

  /** Sela os votos: gera hash fake, persiste pg_votes:u<id> + pg_votes_meta:u<id>. */
  const sealVotes = useCallback(() => {
    const hash = generateHash()
    const at = new Date().toISOString()
    localStorage.setItem(votesKey, JSON.stringify(selection))
    localStorage.setItem(metaKey, JSON.stringify({ hash, at }))
    setSealedVotes(selection)
    setSealedMeta({ hash, at })
    return { success: true, hash }
  }, [selection, votesKey, metaKey])

  /** Limpa apenas a seleção local (não toca os votos selados). */
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