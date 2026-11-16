import { useCallback, useEffect, useRef, useState } from 'react'
import { MOCK_HONORS } from '../../data/mockProfile'
import useCandidacies from '../../hooks/useCandidacies'
import apiFetch from '../../utils/api'

/**
 * ProfileHeader — cartão glassmorphism de identidade do eleitor.
 *
 * Fase 2 (ADR-0002): o avatar deixou de ser dataURL em localStorage
 * (`pg_avatar:u<id>`) e passou a ser real:
 *   - upload → POST /api/users/me/avatar (multipart, Bearer);
 *   - leitura → GET /api/users/me/avatar_file (PRIVADO) retornado como blob e
 *     convertido em objectURL para o <img>.
 * A exclusão de avatar não possui endpoint nesta fase — fica para a Fase 3.
 */

/** Lê tokens/headers da sessão do eleitor de forma defensiva. */
function getToken() {
  try {
    return localStorage.getItem('pg_token')
  } catch {
    return null
  }
}

export default function ProfileHeader({ user }) {
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarError, setAvatarError] = useState('')
  const [uploading, setUploading] = useState(false)
  const objectUrlRef = useRef(null)
  const fileInputRef = useRef(null)
  const { usedCount, maxCandidacies } = useCandidacies()
  // Contagem de votos REAIS do eleitor (GET /api/votes/me, Fase 2).
  const [myVotesCount, setMyVotesCount] = useState(null)

  /** Revoga o objectURL anterior e guarda o novo (evita vazamento de memória). */
  const replaceObjectUrl = useCallback((url) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = url
    setAvatarUrl(url)
  }, [])

  /**
   * Busca os bytes do avatar logado (endpoint privado) como blob e gera um
   * objectURL. 404 = usuário sem avatar → mantém o ícone dourado.
   */
  const loadAvatar = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch('/api/users/me/avatar_file', {
        headers: { Authorization: `Bearer ${token}` },
      })
      // 404 é esperado quando o eleitor ainda não enviou foto.
      if (!res.ok) {
        if (res.status !== 404) {
          console.error('[ProfileHeader] Falha ao ler avatar', res.status)
        }
        return
      }
      const blob = await res.blob()
      replaceObjectUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error('[ProfileHeader] Erro de rede ao ler avatar', err)
    }
  }, [replaceObjectUrl])

  // Carrega o avatar ao montar e quando a identidade muda.
  useEffect(() => {
    loadAvatar()
  }, [loadAvatar, user?.id])

  // Lê o nº de cédulas registradas pelo próprio eleitor (sigilo: endpoint "me").
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await apiFetch('/api/votes/me', { token: true })
      if (cancelled) return
      setMyVotesCount(res.ok && Array.isArray(res.data) ? res.data.length : 0)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Limpa o objectURL no unmount.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Checagem de UX no cliente; o servidor revalida tamanho e tipo real.
    if (file.size > 200 * 1024) {
      setAvatarError('Foto muito pesada: máx. 200KB (a gala não paga hosting extra).')
      e.target.value = ''
      return
    }

    const form = new FormData()
    form.append('file', file)

    setUploading(true)
    const res = await apiFetch('/api/users/me/avatar', {
      method: 'POST',
      body: form,
      token: true,
      isForm: true,
    })
    setUploading(false)
    // Permite re-selecionar o mesmo arquivo no próximo clique.
    e.target.value = ''

    if (!res.ok) {
      if (res.status === 413) {
        setAvatarError('Foto muito pesada: máx. 200KB (a gala não paga hosting extra).')
      } else if (res.status === 415) {
        setAvatarError('Formato não suportado: use JPEG, PNG ou WebP.')
      } else if (res.status === 401) {
        setAvatarError('Sessão expirada: entre na gala novamente.')
      } else {
        setAvatarError('Falha ao enviar a foto. Tente novamente.')
      }
      return
    }

    setAvatarError('')
    // O upload retorna a URL; como o endpoint é privado, rebuscamos os bytes.
    await loadAvatar()
  }

  /** Remove o avatar (DELETE real: apaga o arquivo do servidor + referência). */
  async function handleAvatarRemove() {
    setUploading(true)
    const res = await apiFetch('/api/users/me/avatar', { method: 'DELETE', token: true })
    setUploading(false)
    if (res.ok || res.status === 204) {
      setAvatarError('')
      // Revoga o objectURL anterior e volta ao ícone dourado padrão.
      replaceObjectUrl(null)
    } else if (res.status === 401) {
      setAvatarError('Sessão expirada: entre na gala novamente.')
    } else {
      setAvatarError('Falha ao remover a foto. Tente novamente.')
    }
  }

  const displayName = user?.vulgo || user?.username || 'Eleitor Anônimo'
  const handle = user?.username || ''

  return (
    <div className="bg-surface-container/75 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-80" />

      {/* ---- Identidade ---- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar circular 96px */}
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-container via-primary-fixed to-primary flex items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.35)] p-[3px]">
            <div className="w-full h-full rounded-full bg-surface-container-lowest flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-primary text-[40px]">workspace_premium</span>
              )}
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-primary text-on-primary rounded-full p-1 shadow-md flex items-center justify-center">
            <span className="material-symbols-outlined text-[16px]">verified</span>
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="bg-primary/15 text-primary-fixed text-label-sm px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">verified</span>
              Eleitor &amp; Candidato Ativo
            </span>
          </div>
          <h2 className="font-serif font-bold text-headline-sm text-on-surface tracking-tight">{displayName}</h2>
          <div className="flex items-center gap-2 text-on-surface-variant text-body-sm mt-0.5">
            <span className="font-semibold text-primary">@{handle}</span>
            <span>•</span>
            <span className="italic">"Sempre certo, até na ata do cartório"</span>
          </div>
        </div>
      </div>

      {/* ---- Upload de avatar (real: /api/users/me/avatar) ---- */}
      <div className="flex items-center gap-2 mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary text-label-sm uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[16px]">photo_camera</span>
          {uploading ? 'Enviando...' : 'Alterar foto'}
        </button>
        {avatarUrl && (
          // Exclusão REAL (DELETE /api/users/me/avatar): apaga arquivo + referência.
          <button
            type="button"
            onClick={handleAvatarRemove}
            disabled={uploading}
            title="Remover foto de perfil"
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-error text-label-sm uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Remover
          </button>
        )}
      </div>
      {avatarError && (
        <p className="font-sans text-body-sm text-error flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-[14px]">warning</span>
          {avatarError}
        </p>
      )}

      {/* ---- Mini-stats ---- */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="bg-surface-container/70 backdrop-blur-md rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="text-label-sm uppercase tracking-wider">Votos 2025</span>
            <span className="material-symbols-outlined text-[16px] text-primary">how_to_vote</span>
          </div>
          {/* Contagem REAL: GET /api/votes/me (cédulas do próprio eleitor). */}
          <div className="font-serif font-bold text-headline-sm text-on-surface">
            {myVotesCount == null ? '—' : String(myVotesCount).padStart(2, '0')}
          </div>
          <div className="text-label-sm text-primary flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-ping" /> de 4 categorias
          </div>
        </div>
        <div className="bg-surface-container/70 backdrop-blur-md rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="text-label-sm uppercase tracking-wider">Candidaturas</span>
            <span className="material-symbols-outlined text-[16px] text-secondary">campaign</span>
          </div>
          <div className="font-serif font-bold text-headline-sm text-on-surface">{String(usedCount).padStart(2, '0')}</div>
          <div className="text-label-sm text-secondary flex items-center gap-1 mt-0.5">de {maxCandidacies} submissões</div>
        </div>
        <div className="bg-surface-container/70 backdrop-blur-md rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="text-label-sm uppercase tracking-wider">Honrarias</span>
            <span className="material-symbols-outlined text-[16px] text-primary">military_tech</span>
          </div>
          <div className="font-serif font-bold text-headline-sm text-on-surface">{String(MOCK_HONORS.length).padStart(2, '0')}</div>
          <div className="text-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5">condecorações</div>
        </div>
      </div>
    </div>
  )
}
