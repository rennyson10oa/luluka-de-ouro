import { useEffect, useState, useCallback } from 'react'

/**
 * useAuth — MOCK de autenticação.
 *
 * Estado persistido em localStorage (chave "pg_user" guardando { username }).
 * Substituir por chamadas a /api/auth + JWT quando o backend FastAPI estiver pronto.
 *
 * Fluxo mock:
 *  - login(username, password): valida não-vazios, aguarda ~600ms, persiste.
 *  - register(username, password): mesmo fluxo, sem checagem de força de senha.
 *  - logout(): limpa localStorage e estado.
 */

const STORAGE_KEY = 'pg_user'

function readUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function useAuth() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    setUser(readUser())
  }, [])

  const login = useCallback(async (username, password) => {
    await delay(600)
    if (!username || !password) {
      return { success: false, error: 'Usuário ou senha incorretos' }
    }
    const next = { username }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setUser(next)
    return { success: true }
  }, [])

  const register = useCallback(async (username, password) => {
    await delay(600)
    if (!username || !password) {
      return { success: false, error: 'Preencha todos os campos' }
    }
    const next = { username }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setUser(next)
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return {
    user,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
  }
}
