import { useEffect, useState, useCallback } from 'react'

/**
 * useAdminAuth — MOCK de autenticação administrativa.
 *
 * Estratégia (ver docs/arquitetura/adrs/adr-0001 e docs/backend/05-backend.md):
 * senha única via VITE_ADMIN_PASSWORD com fallback hardcoded. Qualquer gate
 * client-side é visível no bundle — aqui o valor é o ritual e a DX de rotação,
 * não criptografia. Quando o backend entrar, este hook vira chamada a
 * /api/admin/login e a flag vira role no JWT.
 *
 * Sessão em sessionStorage: fechar a aba encerra o acesso admin (higiene).
 */

const ADMIN_KEY = 'pg_admin'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'luluka2025'

function readAdmin() {
  try {
    const raw = sessionStorage.getItem(ADMIN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function useAdminAuth() {
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    setAdmin(readAdmin())
  }, [])

  const loginAdmin = useCallback(async (password) => {
    await delay(500)
    if (password !== ADMIN_PASSWORD) {
      return { success: false, error: 'Senha soberana incorreta' }
    }
    const next = { username: '@AdminMor', role: 'Superuser • Juiz de Paz' }
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(next))
    setAdmin(next)
    return { success: true }
  }, [])

  const logoutAdmin = useCallback(() => {
    sessionStorage.removeItem(ADMIN_KEY)
    setAdmin(null)
  }, [])

  return { admin, isAdmin: Boolean(admin), loginAdmin, logoutAdmin }
}
