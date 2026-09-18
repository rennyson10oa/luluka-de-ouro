import { createContext, useContext, useEffect, useState, useCallback } from 'react'

/**
 * useAdminAuth / AdminAuthProvider — MOCK de autenticação administrativa.
 *
 * ARQUITETURA (mesmo padrão do AuthProvider em useAuth.jsx): o estado vive em
 * UM AdminAuthProvider no topo da árvore (App.jsx). Antes do provider,
 * AdminPage/AdminGate/AdminPanel criavam instâncias independentes — o logout
 * do painel não refletia na página e o gate só aparecia após reload.
 *
 * Estratégia (ver docs/arquitetura/adrs/adr-0001 e docs/backend/05-backend.md):
 * senha única via VITE_ADMIN_PASSWORD com fallback hardcoded. Qualquer gate
 * client-side é visível no bundle — aqui o valor é o ritual e a DX de rotação,
 * não criptografia. Na Fase 2 este hook vira chamada a /api/admin/login e a
 * flag vira role no JWT.
 *
 * Sessão em sessionStorage: fechar a aba encerra o acesso admin (higiene).
 */

const ADMIN_KEY = 'pg_admin'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'luluka2025'

const AdminAuthContext = createContext(null)

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

/**
 * AdminAuthProvider — dono único do estado administrativo. Montar uma vez só,
 * acima do Router (ver App.jsx).
 */
export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)

  // Hidratação: lê a sessão do sessionStorage ao montar (uma única vez).
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

  return (
    <AdminAuthContext.Provider
      value={{ admin, isAdmin: Boolean(admin), loginAdmin, logoutAdmin }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

/**
 * useAdminAuth — consumidor do contexto administrativo. Compartilha o MESMO
 * estado entre AdminPage, AdminGate e AdminPanel.
 */
export default function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth deve ser usado dentro de <AdminAuthProvider> (ver App.jsx)')
  }
  return ctx
}
