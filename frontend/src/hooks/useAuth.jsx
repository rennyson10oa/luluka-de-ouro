import { createContext, useContext, useEffect, useState, useCallback } from 'react'

/**
 * useAuth / AuthProvider — autenticação real contra o backend FastAPI (JWT Bearer).
 *
 * ARQUITETURA (ADR-0001): o estado de autenticação vive em UM AuthProvider
 * no topo da árvore (App.jsx). Todas as telas consomem o mesmo contexto via
 * useAuth() — um updateProfile reflete instantaneamente no Header, no
 * ProfileHeader e em qualquer consumidor. Antes do provider, cada instância
 * do hook tinha estado próprio e o perfil só atualizava após reload.
 *
 * Estado persistido em localStorage:
 *   - pg_token → JWT emitido pelo cartório (Authorization: Bearer)
 *   - pg_user  → { id, username, vulgo } devolvido por GET /api/me
 *
 * Interface pública (compatível com todas as páginas existentes):
 *   user, isAuthenticated, login, register, logout, updateProfile, changePassword
 *
 * Nota: pg_user continua sendo gravado porque os guards das páginas o leem
 * de forma síncrona (a hidratação do contexto é assíncrona via useEffect).
 */

const TOKEN_KEY = 'pg_token'
const USER_KEY = 'pg_user'

const AuthContext = createContext(null)

/**
 * Helper de fetch contra o backend: adiciona Authorization Bearer quando há
 * token, serializa o body como JSON e normaliza a resposta em
 * { ok, status, data } (data = JSON parseado ou null).
 */
async function api(path, { method = 'GET', body, token } = {}) {
  try {
    const headers = {}
    if (body) headers['Content-Type'] = 'application/json'
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    return { ok: res.ok, status: res.status, data }
  } catch {
    // Erro de rede / CORS / servidor caído
    return { ok: false, status: 0, data: null }
  }
}

/**
 * AuthProvider — dono único do estado de autenticação. Montar uma vez só,
 * acima do Router (ver App.jsx).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  // Hidratação de sessão ao montar (uma única vez, aqui no provider):
  // - Com pg_token → valida contra GET /api/me (200 → refresca pg_user).
  // - 401/erro de rede → limpa pg_token e pg_user (sessão morta).
  // - Sem pg_token → limpa pg_user (invalida sessões mock legadas).
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      localStorage.removeItem(USER_KEY)
      setUser(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const res = await api('/api/me', { token })
      if (cancelled) return
      if (res.ok && res.data) {
        localStorage.setItem(USER_KEY, JSON.stringify(res.data))
        setUser(res.data)
      } else {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setUser(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await api('/api/login', { method: 'POST', body: { username, password } })
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Usuário ou senha incorretos' }
      }
      return { success: false, error: 'Cartório indisponível: o servidor da gala não respondeu' }
    }
    const token = res.data?.access_token
    if (!token) {
      return { success: false, error: 'Cartório indisponível: o servidor da gala não respondeu' }
    }
    localStorage.setItem(TOKEN_KEY, token)
    const me = await api('/api/me', { token })
    if (me.ok && me.data) {
      localStorage.setItem(USER_KEY, JSON.stringify(me.data))
      setUser(me.data)
    } else {
      localStorage.setItem(USER_KEY, JSON.stringify({ username }))
      setUser({ username })
    }
    return { success: true }
  }, [])

  const register = useCallback(async (username, password) => {
    const res = await api('/api/register', { method: 'POST', body: { username, password } })
    if (!res.ok) {
      if (res.status === 400) {
        return { success: false, error: 'Este nome de usuário já foi registrado em cartório' }
      }
      return { success: false, error: 'Cartório indisponível: o servidor da gala não respondeu' }
    }
    const token = res.data?.access_token
    if (!token) {
      return { success: false, error: 'Cartório indisponível: o servidor da gala não respondeu' }
    }
    localStorage.setItem(TOKEN_KEY, token)
    const me = await api('/api/me', { token })
    if (me.ok && me.data) {
      localStorage.setItem(USER_KEY, JSON.stringify(me.data))
      setUser(me.data)
    } else {
      localStorage.setItem(USER_KEY, JSON.stringify({ username }))
      setUser({ username })
    }
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async ({ username, vulgo } = {}) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      return { success: false, error: 'Sessão expirada: entre na gala novamente' }
    }
    const body = {}
    if (username !== undefined) body.username = username
    if (vulgo !== undefined) body.vulgo = vulgo
    const res = await api('/api/users/me', { method: 'PATCH', body, token })
    if (!res.ok) {
      if (res.status === 400) {
        return { success: false, error: 'Este nome de usuário já foi registrado em cartório' }
      }
      if (res.status === 401) {
        return { success: false, error: 'Sessão expirada: entre na gala novamente' }
      }
      return { success: false, error: 'Cartório indisponível: o servidor da gala não respondeu' }
    }
    // Se o handle mudou, o backend emite uma credencial nova → trocamos o token.
    if (res.data?.access_token) {
      localStorage.setItem(TOKEN_KEY, res.data.access_token)
    }
    if (res.data?.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
      setUser(res.data.user)
    }
    return { success: true }
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      return { success: false, error: 'Sessão expirada: entre na gala novamente' }
    }
    const res = await api('/api/users/me/password', {
      method: 'PATCH',
      body: { current_password: currentPassword, new_password: newPassword },
      token,
    })
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'A senha atual não confere' }
      }
      return { success: false, error: 'Cartório indisponível: o servidor da gala não respondeu' }
    }
    return { success: true }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth — consumidor do contexto de autenticação. Compartilha o MESMO
 * estado entre todos os componentes (Header, páginas, guards, hooks).
 */
export default function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider> (ver App.jsx)')
  }
  return ctx
}
