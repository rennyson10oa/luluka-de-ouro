import { useEffect, useState } from 'react'
import useAuth from '../../hooks/useAuth'

/**
 * AccountSettings — "Credencial do WhatsApp / Sessão Segura".
 * Tres formularios contra el backend real:
 *   1. Nome de Exibição na Gala (vulgo) → PATCH /api/users/me
 *   2. Identificador Único (@handle)    → PATCH /api/users/me (re-emite JWT)
 *   3. Modificar Chave Notarial         → PATCH /api/users/me/password
 * Los errores de la API se muestran en un banner compartido.
 */
export default function AccountSettings({ user, onToast }) {
  const { updateProfile, changePassword } = useAuth()

  // Form 1 — Nome de Exibição na Gala (vulgo)
  const [vulgo, setVulgo] = useState(user?.vulgo || '')
  // Form 2 — Identificador Único (@handle)
  const [handle, setHandle] = useState(user?.username || '')
  // Form 3 — Chave Notarial
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [banner, setBanner] = useState(null) // { type: 'success'|'error', msg }
  const [busy, setBusy] = useState('') // '' | 'vulgo' | 'handle' | 'senha'

  // Sincroniza los campos cuando el user cambia (ej: handle re-emitido).
  useEffect(() => {
    setVulgo(user?.vulgo || '')
    setHandle(user?.username || '')
  }, [user?.vulgo, user?.username])

  const handleValid = handle.trim().length >= 3
  const newPasswordValid = newPassword.length >= 4
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  async function saveVulgo(e) {
    e.preventDefault()
    setBanner(null)
    setBusy('vulgo')
    const res = await updateProfile({ vulgo: vulgo.trim() })
    setBusy('')
    if (res.success) {
      setBanner({ type: 'success', msg: 'Credencial atualizada!' })
    } else {
      setBanner({ type: 'error', msg: res.error || 'Não foi possível atualizar' })
    }
  }

  async function saveHandle(e) {
    e.preventDefault()
    if (!handleValid) return
    const next = handle.trim()
    if (next === user?.username) {
      // Nada que cambiar: feedback amable sin llamar al backend.
      setBanner({ type: 'success', msg: 'Handle atualizado — nova credencial emitida' })
      return
    }
    setBanner(null)
    setBusy('handle')
    const res = await updateProfile({ username: next })
    setBusy('')
    if (res.success) {
      setBanner({ type: 'success', msg: 'Handle atualizado — nova credencial emitida' })
    } else {
      setBanner({ type: 'error', msg: res.error || 'Não foi possível atualizar' })
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    if (!passwordsMatch || !newPasswordValid) return
    setBanner(null)
    setBusy('senha')
    const res = await changePassword(currentPassword, newPassword)
    setBusy('')
    if (res.success) {
      setBanner({ type: 'success', msg: 'Chave notarial protocolada e atualizada com sucesso!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setBanner({ type: 'error', msg: res.error || 'Não foi possível atualizar' })
    }
  }

  return (
    <div className="bg-surface-container/75 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* ---- Cabeçalho ---- */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">badge</span>
          <h3 className="font-serif font-bold text-title-lg text-on-surface">Credencial do WhatsApp</h3>
        </div>
        <span className="text-label-sm text-on-surface-variant uppercase tracking-widest">Sessão Segura</span>
      </div>

      {/* ---- Banner de feedback (éxito o error de la API) ---- */}
      {banner && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg mb-5 ${
            banner.type === 'success' ? 'bg-primary/15 text-primary' : 'bg-error-container/20 text-error'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">
            {banner.type === 'success' ? 'verified' : 'warning'}
          </span>
          <span className="font-sans font-bold text-body-sm">{banner.msg}</span>
        </div>
      )}

      {/* ---- Form 1: Nome de Exibição na Gala (vulgo) ---- */}
      <form className="flex flex-col gap-4" onSubmit={saveVulgo}>
        <div className="flex flex-col gap-1.5">
          <label className="font-sans font-bold text-label-md text-secondary tracking-wider" htmlFor="vulgoInput">
            NOME DE EXIBIÇÃO NA GALA
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">badge</span>
            </div>
            <input
              id="vulgoInput"
              type="text"
              value={vulgo}
              onChange={(e) => setVulgo(e.target.value)}
              placeholder="Como o grupo te conhece"
              className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-4 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy === 'vulgo'}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-semibold text-body-md shadow-[0_0_16px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          {busy === 'vulgo' ? 'Protocolando...' : 'Salvar'}
        </button>
      </form>

      <div className="my-6 h-[1px] bg-surface-container-highest/60" />

      {/* ---- Form 2: Identificador Único (@handle) ---- */}
      <form className="flex flex-col gap-4" onSubmit={saveHandle}>
        <div className="flex flex-col gap-1.5">
          <label className="font-sans font-bold text-label-md text-secondary tracking-wider" htmlFor="handleInput">
            IDENTIFICADOR ÚNICO (@HANDLE)
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">alternate_email</span>
            </div>
            <input
              id="handleInput"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/^@/, ''))}
              placeholder="SeuHandle"
              className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-4 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
            />
          </div>
          <p className="font-sans text-body-sm text-on-surface-variant mt-1 text-[11px] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">info</span>
            Alterar o @handle emite uma nova credencial de sessão.
          </p>
          {!handleValid && (
            <p className="font-sans text-body-sm text-outline mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              Mínimo de 3 caracteres.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={busy === 'handle' || !handleValid}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-semibold text-body-md shadow-[0_0_16px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          {busy === 'handle' ? 'Re-emitindo credencial...' : 'Salvar'}
        </button>
      </form>

      <div className="my-6 h-[1px] bg-surface-container-highest/60" />

      {/* ---- Form 3: Modificar Chave Notarial ---- */}
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary text-[20px]">enhanced_encryption</span>
        <h4 className="font-serif font-bold text-title-md text-on-surface">Modificar Chave Notarial</h4>
      </div>

      <form className="flex flex-col gap-4" onSubmit={savePassword}>
        <div className="flex flex-col gap-1.5">
          <label className="font-sans font-bold text-label-md text-secondary tracking-wider" htmlFor="currentPassInput">
            SENHA ATUAL DE ACESSO
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">key</span>
            </div>
            <input
              id="currentPassInput"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-4 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-sans font-bold text-label-md text-secondary tracking-wider" htmlFor="newPassInput">
            NOVA SENHA NOTARIAL
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">lock_reset</span>
            </div>
            <input
              id="newPassInput"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mín. 4 caracteres"
              className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-4 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-sans font-bold text-label-md text-secondary tracking-wider" htmlFor="confirmPassInput">
            CONFIRMAR NOVA CHAVE
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </div>
            <input
              id="confirmPassInput"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-4 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
            />
          </div>
          {newPassword.length > 0 && !passwordsMatch && (
            <p className="font-sans text-body-sm text-error mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">close</span>
              As senhas ainda não coincidem.
            </p>
          )}
        </div>

        <div className="bg-surface-container-lowest/60 rounded-lg p-3 flex items-start gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-primary flex-shrink-0 mt-0.5">info</span>
          <p className="font-sans text-body-sm text-[11px] leading-tight">
            Mínimo 4 caracteres. Senha fraca é permitida, aqui é zoeira.
          </p>
        </div>

        <button
          type="submit"
          disabled={busy === 'senha' || !passwordsMatch || !newPasswordValid}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-body-md shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_28px_rgba(212,175,55,0.5)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[20px]">lock_reset</span>
          {busy === 'senha' ? 'Protocolando chave...' : 'Atualizar Senha Notarial'}
        </button>
      </form>
    </div>
  )
}