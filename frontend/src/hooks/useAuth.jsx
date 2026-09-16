import { useEffect, useState, useCallback } from 'react'

/**
 * useAuth — autenticação real contra o backend FastAPI (JWT Bearer).
 *
 * Estado persistido em localStorage:
 *   - pg_token → JWT emitido pelo cartório (Authorization: Bearer)
 *   - pg_user  → { id, username, vulgo } devolvido por GET /api/me
 *
 * Interface pública preservada (compatível com todas as páginas existentes):
 *   user, isAuthenticated, login, register, logout
 * + novidades: updateProfile, changePassword
 *
 * Nota: pg_user continua sendo gravado porque o guard do VotePage o lê de
 * forma síncrona (useAuth hidrata de forma assíncrona via useEffect).
 */

const TOKEN_KEY = 'pg_token'
const USER_KEY = 'pg_user'

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

export default function useAuth() {
  const [user, setUser] = useState(null)

  // Hidratación de sesión al montar:
  // - Con pg_token → valida contra GET /api/me (200 → refresca pg_user).
  // - 401/erro de red → limpia pg_token y pg_user (sesión muerta).
  // - Sin pg_token → limpia pg_user (invalida sesiones mock legadas).
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
      // Login ok pero /api/me falló: sesión parcial con el username enviado.
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

  return {
    user,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  }
}