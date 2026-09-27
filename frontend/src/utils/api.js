/**
 * apiFetch — util compartilhado de comunicação com o backend FastAPI.
 *
 * Nasceu na Fase 2 (ver docs/arquitetura/adrs/adr-0002-integracao-mocks-backend.md)
 * para que TODOS os hooks/páginas consumam os endpoints reais do cartório sem
 * repetir o boilerplate de headers, JSON e tratamento de erro.
 *
 * Contrato:
 *   apiFetch(path, { method, body, token, isForm }) → { ok, status, data }
 *
 *   - `token: true`  → lê o Bearer de localStorage.getItem('pg_token');
 *   - `token: '<jwt>'` → usa o token informado (ex.: token do admin, que vive
 *     em outra chave);
 *   - `body` + !isForm → serializa JSON e define Content-Type: application/json;
 *   - `isForm: true` → envia FormData e deixa o browser definir o boundary
 *     (upload de avatar);
 *   - NUNCA lança: erros de rede/CORS voltam como { ok:false, status:0, data:null }
 *     e cada chamador decide se degrada, exibe toast ou mantém o mock.
 */

/** Lê o token do eleitor de localStorage de forma defensiva (SSR/privacidade). */
function readStoredToken() {
  try {
    return localStorage.getItem('pg_token')
  } catch {
    return null
  }
}

export async function apiFetch(path, { method = 'GET', body, token, isForm } = {}) {
  try {
    const headers = {}

    // FormData: não definir Content-Type manualmente (o browser injeta o boundary).
    if (isForm) {
      // sem header de conteúdo
    } else if (body !== undefined && body !== null) {
      headers['Content-Type'] = 'application/json'
    }

    // Token explícito (string) tem prioridade; `token:true` busca a sessão do eleitor.
    let authToken = null
    if (typeof token === 'string' && token) {
      authToken = token
    } else if (token === true) {
      authToken = readStoredToken()
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const payload = isForm ? body : body !== undefined && body !== null ? JSON.stringify(body) : undefined

    const res = await fetch(path, { method, headers, body: payload })

    // JSON quando o servidor diz que é JSON; senão texto puro (ex.: detail string).
    let data = null
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        data = await res.json()
      } catch {
        data = null
      }
    } else {
      try {
        data = (await res.text()) || null
      } catch {
        data = null
      }
    }

    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    // Rede caída / CORS / servidor fora do ar: degrada sem quebrar a tela.
    console.error(`[apiFetch] Falha de rede em ${method} ${path}`, err)
    return { ok: false, status: 0, data: null }
  }
}

/**
 * extractErrorDetail — normaliza o `detail` do FastAPI para uma string.
 * O backend usa `detail` string nas HTTPException, mas validações 422
 * devolvem uma lista; ambas viram texto legível.
 */
export function extractErrorDetail(data, fallback = '') {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const first = data.detail[0]
    if (typeof first === 'string') return first
    if (first && typeof first.msg === 'string') return first.msg
  }
  return fallback
}

export default apiFetch
