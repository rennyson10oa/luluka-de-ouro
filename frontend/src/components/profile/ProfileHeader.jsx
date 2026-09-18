import { useEffect, useRef, useState } from 'react'
import { MOCK_HONORS } from '../../data/mockProfile'
import useCandidacies from '../../hooks/useCandidacies'
import { scopedKey } from '../../utils/userScope'

/** Lê o avatar em dataURL guardado no storage com escopo (ou null). */
function readAvatar(key) {
  try {
    return localStorage.getItem(key) || null
  } catch {
    return null
  }
}

/** Conta os votos REAIS da cédula mock (pg_votes:u<id>) — só entradas com voto.
 *  A chave precisa ser idêntica à que o useBallot escreve. */
function countVotes(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return 0
    const votes = JSON.parse(raw)
    return Object.values(votes).filter(Boolean).length
  } catch {
    return 0
  }
}

/**
 * ProfileHeader — tarjeta glassmorphism de identidad del eleitor:
 * avatar circular (dataURL de pg_avatar:u<id> ou ícone dourado), badge de estado,
 * nome de exibição (vulgo || username), @handle, quote estática e 3 mini-stats.
 * O upload de avatar é MOCK funcional (persiste com escopo do eleitor, <200KB).
 */
export default function ProfileHeader({ user }) {
  const avatarKey = scopedKey('pg_avatar', user)
  const votesKey = scopedKey('pg_votes', user)
  const [avatar, setAvatar] = useState(() => readAvatar(avatarKey))
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef(null)
  const { usedCount, maxCandidacies } = useCandidacies()

  // Re-sincroniza o avatar se a identidade mudar sem remount (hidratação).
  useEffect(() => {
    setAvatar(readAvatar(avatarKey))
  }, [avatarKey])

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200 * 1024) {
      setAvatarError('Foto muito pesada: máx. 200KB (a gala não paga hosting extra).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      localStorage.setItem(avatarKey, reader.result)
      setAvatar(reader.result)
      setAvatarError('')
    }
    reader.readAsDataURL(file)
    // Permite re-selecionar o mesmo arquivo no próximo clique.
    e.target.value = ''
  }

  function removeAvatar() {
    localStorage.removeItem(avatarKey)
    setAvatar(null)
    setAvatarError('')
  }

  const displayName = user?.vulgo || user?.username || 'Eleitor Anônimo'
  const handle = user?.username || ''

  return (
    <div className="bg-surface-container/75 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-80" />

      {/* ---- Identidad ---- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar circular 96px */}
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-container via-primary-fixed to-primary flex items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.35)] p-[3px]">
            <div className="w-full h-full rounded-full bg-surface-container-lowest flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Foto de perfil" className="w-full h-full object-cover" />
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

      {/* ---- Upload de avatar (MOCK funcional) ---- */}
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
          className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary text-label-sm uppercase tracking-wider flex items-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">photo_camera</span>
          Alterar foto
        </button>
        {avatar && (
          <button
            type="button"
            onClick={removeAvatar}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-label-sm uppercase tracking-wider flex items-center gap-1.5 transition-colors"
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
          <div className="font-serif font-bold text-headline-sm text-on-surface">{countVotes(votesKey)}</div>
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