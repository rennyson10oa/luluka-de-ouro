import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import apiFetch from '../utils/api'

/**
 * useAdminAuth / AdminAuthProvider — autenticação administrativa REAL (Fase 2).
 *
 * Fase 2 (ADR-0002): o comparador de senha via VITE_ADMIN_PASSWORD foi trocado
 * por POST /api/admin/login. O access_token do admin é guardado junto do objeto
 * de sessão (na mesma chave 'pg_admin' já usada) e reaproveitado no
 * PUT /api/admin/settings (Authorization: Bearer do admin).
 *
 * ARQUITETURA (mesmo padrão do AuthProvider em useAuth.jsx): o estado vive em
 * UM AdminAuthProvider no topo da árvore (App.jsx) — AdminPage/AdminGate/
 * AdminPanel compartilham a mesma sessão.
 *
 * Sessão em sessionStorage: fechar a aba encerra o acesso admin (higiene).
 */

const ADMIN_KEY = 'pg_admin'

const AdminAuthContext = createContext(null)

function readAdmin() {
  try {
    const raw = sessionStorage.getItem(ADMIN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
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
    const res = await apiFetch('/api/admin/login', {
      method: 'POST',
      body: { password },
    })

    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Senha inválida' }
      }
      return { success: false, error: 'Cartório indisponível: o servidor da gala não respondeu' }
    }

    const token = res.data?.access_token
    if (!token) {
      return { success: false, error: 'Cartório indisponível: o servidor da gala não respondeu' }
    }

    // O objeto guardado ganha o Bearer do admin (usado no PUT de settings).
    const next = { username: '@AdminMor', role: 'Superuser • Juiz de Paz', token }
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
