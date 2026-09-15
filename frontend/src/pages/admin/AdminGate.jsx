import { useState } from 'react'
import { Link } from 'react-router-dom'
import useAdminAuth from '../../hooks/useAdminAuth'

/**
 * AdminGate — tela de desbloqueio do Console Soberano.
 * Exibida em /admin quando não há sessão administrativa ativa.
 * Conteúdo puro: o shell (header, fundo, footer) pertence a AdminPage.
 */
export default function AdminGate() {
  const { loginAdmin } = useAdminAuth()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = await loginAdmin(password)
    setSubmitting(false)
    if (!res.success) {
      setError(res.error || 'Senha soberana incorreta')
      setShake(true)
      setTimeout(() => setShake(false), 450)
    }
  }

  return (
    <div className={`relative w-full max-w-[425px] z-10 ${shake ? 'animate-shake' : ''}`}>
      {/* Selo flutuante */}
      <div className="flex justify-center -mb-3 relative z-20">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest/90 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
          <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">Modo Supremo</span>
        </div>
      </div>

      {/* Card glassmorphism */}
      <div className="w-full rounded-2xl bg-surface-container-lowest/85 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(212,175,55,0.12)]">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(242,202,80,0.4)]">
            <span className="material-symbols-outlined text-[32px]">gavel</span>
          </div>
          <h1 className="font-serif font-bold text-headline-md text-primary tracking-tight mb-1">
            Console Soberano
          </h1>
          <p className="font-sans text-body-md text-on-surface-variant">
            Área restrita da Academia. Identifique-se para exercer o poder absoluto.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-error-container/20 px-space-md py-space-sm rounded-lg mb-4 shadow-[0_0_15px_rgba(147,0,10,0.2)]">
            <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">warning</span>
            <span className="font-sans font-bold text-label-md text-error">{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="font-sans font-bold text-label-md text-secondary tracking-wider" htmlFor="adminPassword">
              SENHA SOBERANA
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              </div>
              <input
                id="adminPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="A senha que nenhum mortal deve saber"
                className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-11 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
              />
              <button
                type="button"
                title="Visualizar senha"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-primary focus:outline-none transition-colors"
              >
                <span className="material-symbols-outlined text-[19px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-xl font-sans font-bold text-title-md text-on-primary bg-gradient-to-r from-primary-fixed via-primary to-primary-container hover:brightness-110 active:scale-[0.99] transition-all duration-300 shadow-[0_0_24px_rgba(212,175,55,0.4)] hover:shadow-[0_0_32px_rgba(212,175,55,0.6)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{submitting ? 'Consultando o cartório...' : 'Desbloquear Console'}</span>
              {!submitting && <span className="material-symbols-outlined text-[20px]">lock_open</span>}
            </button>
          </div>
        </form>

        <div className="mt-5 text-center">
          <Link to="/" className="inline-flex items-center gap-1 font-sans text-body-md text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Fugir para a segurança da gala</span>
          </Link>
        </div>

        <div className="mt-6 pt-4 text-center">
          <p className="font-sans text-body-sm text-outline flex items-center justify-center gap-1.5 select-none">
            <span className="material-symbols-outlined text-[15px] text-secondary">support_agent</span>
            <span>esqueceu a senha? chama o Beto no zap</span>
          </p>
        </div>
      </div>

      {/* Crachá decorativo */}
      <div className="mt-4 px-3 flex items-center justify-between font-sans font-bold text-label-sm text-outline">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          <span>TENTATIVAS REGISTRADAS EM ATA</span>
        </span>
        <span>CARTÓRIO DO BOTECO</span>
      </div>
    </div>
  )
}
