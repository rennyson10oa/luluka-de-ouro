import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import Header from '../components/Header'
import { FooterAuth } from '../components/Footer'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = await login(username.trim(), password)
    setSubmitting(false)
    if (res.success) {
      navigate('/votar')
    } else {
      setError(res.error || 'Usuário ou senha incorretos')
      setShake(true)
      setTimeout(() => setShake(false), 450)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <main className="flex-grow pt-24 pb-8 flex items-center justify-center">
      <div className="relative w-full flex items-center justify-center px-4 py-10 overflow-hidden">
      {/* Efeitos de iluminação ambiente e vinheta da gala */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-24 -left-20 w-[420px] h-[420px] bg-primary-container/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-24 w-[360px] h-[360px] bg-secondary-container/20 rounded-full blur-[110px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface-container-lowest/60 via-surface/40 to-surface-container-lowest/90" />
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

      <div className={`relative w-full max-w-[425px] z-10 ${shake ? 'animate-shake' : ''}`}>
        {/* Selo flutuante superior */}
        <div className="flex justify-center -mb-3 relative z-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest/90 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">Acesso Oficial 2025</span>
          </div>
        </div>

        {/* Card glassmorphism */}
        <div className="w-full rounded-2xl bg-surface-container-lowest/85 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_0_35px_0_rgba(212,175,55,0.18)]">
          {/* Toggle / tabs */}
          <div className="w-full grid grid-cols-2 p-1 rounded-xl bg-surface-container-low mb-7">
            <button type="button" className="py-2 rounded-lg font-sans font-bold text-title-md text-on-primary bg-primary shadow-[0_0_15px_rgba(242,202,80,0.35)] transition-all duration-300">
              Entrar
            </button>
            <Link to="/register" className="py-2 text-center rounded-lg font-sans font-bold text-title-md text-on-surface-variant hover:text-primary transition-all duration-200">
              Criar Conta
            </Link>
          </div>

          {/* Cabeçalho */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.25)] mx-auto mb-2">
              <span className="material-symbols-outlined text-primary text-[26px]">workspace_premium</span>
            </div>
            <h1 className="font-serif font-bold text-headline-md text-primary tracking-tight mb-1">
              Bem-vindo de volta
            </h1>
            <p className="font-sans text-body-md text-on-surface-variant">
              Insira suas credenciais notariais para acessar a cédula e o tribunal supremo do grupo.
            </p>
          </div>

          {/* Banner de erro */}
          {error && (
            <div className="flex items-start gap-space-sm bg-error-container/20 px-space-md py-space-sm rounded-lg mb-4 shadow-[0_0_15px_rgba(147,0,10,0.2)] transition-all duration-300">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">warning</span>
              <div className="flex flex-col">
                <span className="font-sans font-bold text-label-md text-error">{error}</span>
                <span className="font-sans text-body-sm text-on-surface-variant text-[11px] leading-tight">
                  O tribunal de gala rejeitou a assinatura. Revise os dados abaixo.
                </span>
              </div>
            </div>
          )}

          {/* Formulário */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans font-bold text-label-md text-secondary tracking-wider flex items-center justify-between" htmlFor="usernameInput">
                <span>NOME DE USUÁRIO</span>
                <span className="text-outline text-[11px] font-normal normal-case">Identidade Social</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">alternate_email</span>
                </div>
                <input
                  id="usernameInput"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: @BetoChave"
                  className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-4 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-sans font-bold text-label-md text-secondary tracking-wider" htmlFor="passwordInput">
                  SENHA NOTARIAL
                </label>
                <button
                  type="button"
                  onClick={() => alert('Mensagem notarial enviada ao Administrador do Grupo via zap: "Favor desentupir o acesso deste cidadão ilustre".')}
                  className="font-sans text-body-sm text-secondary hover:text-primary transition-colors underline underline-offset-4 decoration-secondary/40"
                >
                  Esqueceu a senha? Chame o admin
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">key</span>
                </div>
                <input
                  id="passwordInput"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta de votação"
                  className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface pl-10 pr-11 py-3 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  title="Mostrar/Ocultar Senha"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-primary focus:outline-none transition-colors"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Lembrar + selo */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-space-xs cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 rounded bg-surface-container-low flex items-center justify-center text-on-primary font-bold peer-checked:bg-primary shadow-inner transition-all group-hover:scale-105">
                  <span className="material-symbols-outlined text-[14px] opacity-0 peer-checked:opacity-100 text-on-primary">check</span>
                </div>
                <span className="font-sans text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                  Lembrar de mim na urna
                </span>
              </label>
              <span className="flex items-center gap-1 text-[11px] font-sans font-bold text-label-sm text-outline">
                <span className="material-symbols-outlined text-[14px] text-primary">verified_user</span>
                Cripto-Zoeira 256
              </span>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-xl font-sans font-bold text-title-md text-on-primary bg-gradient-to-r from-primary-fixed via-primary to-primary-container hover:brightness-110 active:scale-[0.99] transition-all duration-300 shadow-[0_0_24px_rgba(212,175,55,0.4)] hover:shadow-[0_0_32px_rgba(212,175,55,0.6)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{submitting ? 'Verificando assinatura...' : 'Entrar na Gala'}</span>
                {!submitting && <span className="material-symbols-outlined text-[20px]">login</span>}
              </button>
            </div>
          </form>

          {/* Link para cadastro */}
          <div className="mt-5 text-center">
            <p className="font-sans text-body-md text-on-surface-variant">
              Ainda não tem conta?{' '}
              <Link to="/register" className="text-primary font-semibold underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors">
                Entre na disputa
              </Link>
            </p>
          </div>

          {/* Humor discreto */}
          <div className="mt-6 pt-4 text-center">
            <p className="font-sans text-body-sm text-outline flex items-center justify-center gap-1.5 select-none">
              <span className="material-symbols-outlined text-[15px] text-secondary">local_bar</span>
              <span>Acesso auditado por cartório de boteco</span>
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

        {/* Rodapé de links */}
        <div className="mt-4 text-center flex items-center justify-center gap-space-md text-outline">
          <span className="font-sans text-body-sm">Edição Oficial 2025</span>
          <span>•</span>
          <a href="#" className="font-sans text-body-sm hover:text-secondary transition-colors">Estatuto da Zoeira</a>
          <span>•</span>
          <a href="#" className="font-sans text-body-sm hover:text-secondary transition-colors">Tribunal de Recursos</a>
        </div>
      </div>
      </div>
      </main>
      <FooterAuth />
    </div>
  )
}