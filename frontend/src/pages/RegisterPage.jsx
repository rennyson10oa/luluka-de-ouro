import { useState, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import Header from '../components/Header'
import { FooterAuth } from '../components/Footer'

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [terms, setTerms] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const usernameValid = username.trim().length >= 3
  const passwordsMatch = password.length > 0 && password === confirm
  const canSubmit = usernameValid && password.length > 0 && passwordsMatch && terms && !submitting

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = await register(username.trim(), password)
    setSubmitting(false)
    if (res.success) {
      // Mesma convenção do login: devolve o usuário ao destino original
      // que motivou o registro (ou à urna, no fluxo padrão).
      navigate(location.state?.from ?? '/votar', { replace: true })
    } else {
      setError(res.error || 'Não foi possível criar a conta')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <main className="flex-grow pt-24 pb-8 flex items-center justify-center">
      <div className="relative w-full flex items-center justify-center px-4 py-10 overflow-hidden">
      {/* Efeitos de iluminação ambiente e vinheta da gala */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-primary-container/15 via-primary/10 to-transparent rounded-full blur-[120px] opacity-70" />
        <div className="absolute -top-24 right-1/4 w-[420px] h-[420px] bg-tertiary-container/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 left-1/4 w-[380px] h-[380px] bg-secondary-container/20 rounded-full blur-[90px]" />
        {/* SVG sutil de micropartículas douradas */}
        <svg className="absolute inset-0 w-full h-full opacity-35" preserveAspectRatio="none" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
          <circle cx="120" cy="180" fill="#f2ca50" opacity="0.6" r="1.5" />
          <circle cx="280" cy="90" fill="#ffe088" opacity="0.8" r="2" />
          <circle cx="680" cy="220" fill="#d4af37" opacity="0.7" r="2.5" />
          <circle cx="730" cy="560" fill="#f2ca50" opacity="0.5" r="1.5" />
          <circle cx="150" cy="620" fill="#ffe088" opacity="0.6" r="2" />
          <circle cx="410" cy="740" fill="#d4af37" opacity="0.5" r="1.8" />
          <polygon fill="#f2ca50" opacity="0.4" points="210,310 214,314 210,318 206,314" />
          <polygon fill="#ffe088" opacity="0.5" points="610,130 613,134 610,138 607,134" />
          <polygon fill="#ceb05d" opacity="0.4" points="640,680 644,683 640,686 636,683" />
          <polygon fill="#f2ca50" opacity="0.45" points="90,440 94,444 90,448 86,444" />
        </svg>
      </div>

      <div className="relative w-full max-w-[425px] z-10">
        {/* Selo notarial flutuante */}
        <div className="flex justify-center -mb-3 relative z-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest/90 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">Protocolo Eleitoral 2025</span>
          </div>
        </div>

        {/* Card glassmorphism */}
        <div className="w-full rounded-2xl bg-surface-container-lowest/85 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(212,175,55,0.12)]">
          {/* Toggle / tabs — ordem fixa entre telas: Entrar | Criar Conta */}
          <div className="w-full grid grid-cols-2 p-1 rounded-xl bg-surface-container-low mb-7">
            <Link to="/login" className="py-2 text-center rounded-lg font-sans font-bold text-title-md text-on-surface-variant hover:text-primary transition-all duration-200">
              Entrar
            </Link>
            <button type="button" className="py-2 rounded-lg font-sans font-bold text-title-md text-on-primary bg-primary shadow-[0_0_15px_rgba(242,202,80,0.35)] transition-all duration-300">
              Criar Conta
            </button>
          </div>

          {/* Cabeçalho */}
          <div className="text-center mb-6">
            <h1 className="font-serif font-bold text-headline-md text-primary tracking-tight mb-1">
              Entre na disputa
            </h1>
            <p className="font-sans text-body-md text-on-surface-variant">
              Crie sua conta para candidatar-se e votar
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-error-container/20 px-space-md py-space-sm rounded-lg mb-4 shadow-[0_0_15px_rgba(147,0,10,0.2)]">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">warning</span>
              <span className="font-sans font-bold text-label-md text-error">{error}</span>
            </div>
          )}

          {/* Formulário */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans font-bold text-label-md text-secondary tracking-wider flex items-center justify-between" htmlFor="username">
                <span>NOME DE USUÁRIO</span>
                <span className="text-outline text-[11px] font-normal normal-case">visível nos troféus</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">alternate_email</span>
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@SeuNomeOuApelido"
                  className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-4 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
                />
              </div>
              {/* Validação em tempo real */}
              <div className="flex items-center gap-1.5 px-1 pt-0.5">
                {usernameValid ? (
                  <>
                    <span className="material-symbols-outlined text-primary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-sans font-bold text-label-sm text-primary tracking-wide">disponível para nomeação</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-outline text-[14px]">info</span>
                    <span className="font-sans font-bold text-label-sm text-outline">Mínimo de 3 caracteres</span>
                  </>
                )}
              </div>
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans font-bold text-label-md text-secondary tracking-wider" htmlFor="password">
                SENHA DE ACESSO
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-11 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
                />
                <button
                  type="button"
                  id="toggle-password"
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

            {/* Confirmar senha */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans font-bold text-label-md text-secondary tracking-wider" htmlFor="confirm-password">
                CONFIRMAR SENHA
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                </div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita sua senha"
                  className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-11 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[18px]">
                    {confirm.length === 0 ? 'sync' : passwordsMatch ? 'verified' : 'cancel'}
                  </span>
                </div>
              </div>
              {/* Feedback de match dinâmico */}
              <div className="flex items-center gap-1.5 px-1 pt-0.5">
                {confirm.length === 0 ? (
                  <span className="font-sans text-body-sm text-outline">Digite a mesma senha para liberar a urna</span>
                ) : passwordsMatch ? (
                  <>
                    <span className="material-symbols-outlined text-primary text-[14px]">check</span>
                    <span className="font-sans font-bold text-label-sm text-primary">Senhas conferem! Voto garantido</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-error text-[14px]">close</span>
                    <span className="font-sans font-bold text-label-sm text-error">As senhas ainda não coincidem</span>
                  </>
                )}
              </div>
            </div>

            {/* Termos */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-primary bg-surface-container cursor-pointer"
                />
                <span className="font-sans text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                  Concordo em aceitar o veredito popular e não sair do grupo por causa de memes.
                </span>
              </label>
            </div>

            {/* Botão primário */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3.5 px-6 rounded-xl font-sans font-bold text-title-md text-on-primary bg-gradient-to-r from-primary-fixed via-primary to-primary-container hover:brightness-110 active:scale-[0.99] transition-all duration-300 shadow-[0_0_24px_rgba(212,175,55,0.4)] hover:shadow-[0_0_32px_rgba(212,175,55,0.6)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_0_24px_rgba(212,175,55,0.4)]"
              >
                <span>{submitting ? 'Lacrando protocolo...' : 'Criar conta'}</span>
                {!submitting && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
              </button>
            </div>
          </form>

          {/* Redirecionamento */}
          <div className="mt-5 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 font-sans text-body-md text-on-surface-variant hover:text-primary transition-colors">
              <span>Já tem conta?</span>
              <span className="text-primary font-semibold underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Entrar</span>
            </Link>
          </div>

          {/* Humor discreto */}
          <div className="mt-6 pt-4 text-center">
            <p className="font-sans text-body-sm text-outline flex items-center justify-center gap-1.5 select-none">
              <span className="material-symbols-outlined text-[15px] text-secondary">lock_open_right</span>
              <span>senha fraca é permitida, aqui é zoeira</span>
            </p>
          </div>
        </div>

        {/* Crachá decorativo */}
        <div className="mt-4 px-3 flex items-center justify-between font-sans font-bold text-label-sm text-outline">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span>SESSÃO CRIPTOGRAFADA</span>
          </span>
          <span>ACADEMIA DO GRUPO • 2025</span>
        </div>
      </div>
      </div>
      </main>
      <FooterAuth />
    </div>
  )
}
