import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import useBallot from '../hooks/useBallot'
import Header from '../components/Header'
import { Footer } from '../components/Footer'
import CategorySection from '../components/ballot/CategorySection'
import ConfirmModal from '../components/ballot/ConfirmModal'

// ---------------------------------------------------------------------------
// Helpers da cédula
// ---------------------------------------------------------------------------

/**
 * Cheque síncrono de sessão. O useAuth hidrata de forma assíncrona (useEffect),
 * então no 1º render após navegar de /login o estado ainda é null.
 * Sem este chequeo, um usuário logado receberia um redirect falso para /login.
 */
function hasStoredSession() {
  try {
    return Boolean(localStorage.getItem('pg_user'))
  } catch {
    return false
  }
}

/** Alvo do fechamento das urnas: pg_reveal_at (se futuro) ou mock +4d. */
function getRevealTarget() {
  try {
    const saved = localStorage.getItem('pg_reveal_at')
    if (saved) {
      const d = new Date(saved)
      if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) return d
    }
  } catch {
    // storage indisponible → mock
  }
  return new Date(Date.now() + (4 * 24 * 3600 + 18 * 3600 + 42 * 60 + 15) * 1000)
}

/** Formato "04d 18h 41m 20s". */
function formatCountdown(diff) {
  const pad = (n) => String(n).padStart(2, '0')
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

/** Data legível em pt-BR para o registro do selo. */
function formatRegisteredAt(iso) {
  if (!iso) return '--:--:--'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '--:--:--' : d.toLocaleString('pt-BR')
}

export default function VotePage() {
  const { isAuthenticated, user } = useAuth()
  const ballot = useBallot()

  const [modalOpen, setModalOpen] = useState(false)
  const [countdown, setCountdown] = useState('')
  const [revealTarget] = useState(getRevealTarget)

  // Mini-countdown inline (1s) para el cierre de urnas.
  useEffect(() => {
    function tick() {
      setCountdown(formatCountdown(Math.max(0, revealTarget - Date.now())))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [revealTarget])

  // ---- Guard de auth ----
  if (!isAuthenticated) {
    if (!hasStoredSession()) {
      return <Navigate to="/login" replace state={{ from: '/votar' }} />
    }
    // Sessão salva, mas o useAuth ainda está hidratando (1º render após a navegação).
    return (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-28">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
            <span className="font-sans text-body-sm text-on-surface-variant">Verificando credenciales notariales...</span>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const {
    categories,
    selection,
    hasSealed,
    sealedVotes,
    sealedMeta,
    toggleSelection,
    isSelfVote,
    progress,
    sealVotes,
    resetSelection,
    isClosed,
  } = ballot

  const pct = progress.total > 0 ? Math.round((progress.selected / progress.total) * 100) : 0

  // ---- Estado: urnas fechadas ----
  if (isClosed) {
    return (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <Header />
        <main className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-12 pt-28 pb-24">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-0 -z-10 bg-primary/10 blur-[120px] rounded-full" />
            <div className="relative w-full rounded-2xl bg-surface-container-lowest/85 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_0_35px_0_rgba(212,175,55,0.18)] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />

              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(212,175,55,0.3)]">
                <span className="material-symbols-outlined text-primary text-[32px]">lock</span>
              </div>

              <h3 className="font-serif font-bold text-headline-sm text-primary text-center mb-2">
                As Urnas Estão Fechadas
              </h3>
              <p className="font-sans text-body-md text-on-surface-variant text-center mb-6">
                O prazo notarial para votação encerrou-se. Aguarde a cerimônia de reveal.
              </p>

              <Link
                to="/"
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-sans font-bold text-body-md transition-all shadow-[0_0_16px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Voltar à Gala
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ---- Estado: votos selados ----
  if (hasSealed) {
    return (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <Header />
        <main className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-12 pt-28 pb-24">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-0 -z-10 bg-primary/10 blur-[120px] rounded-full" />
            <div className="relative w-full rounded-2xl bg-surface-container-lowest/85 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_0_35px_0_rgba(212,175,55,0.18)] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />

              <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(212,175,55,0.4)]">
                <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              </div>

              <h3 className="font-serif font-bold text-headline-sm text-primary text-center mb-2">
                Votos Selados na Cripta!
              </h3>
              <p className="font-sans text-body-md text-on-surface-variant text-center mb-6">
                Sua cédula foi transmitida com sucesso para o banco de dados soberano. Seus comparsas jamais saberão em quem você votou — até o grande dia da revelação!
              </p>

              {/* Metadados do selo */}
              <div className="bg-surface-container p-4 rounded-xl mb-6 space-y-2">
                <div className="flex justify-between font-sans font-bold text-label-sm text-outline">
                  <span>Protocolo Hash:</span>
                  <span className="font-mono text-primary">{sealedMeta.hash || '—'}</span>
                </div>
                <div className="flex justify-between font-sans font-bold text-label-sm text-outline">
                  <span>Horário do Registro:</span>
                  <span className="font-mono text-on-surface">{formatRegisteredAt(sealedMeta.at)}</span>
                </div>
              </div>

              {/* Lista compacta das escolhas */}
              <div className="bg-surface-container-low rounded-xl p-4 mb-6">
                <p className="font-sans font-bold text-label-sm text-secondary uppercase tracking-wider mb-2">
                  Suas escolhas seladas
                </p>
                <ul className="space-y-1.5">
                  {categories.map((cat) => {
                    const nomineeId = sealedVotes[cat.id]
                    const nominee = nomineeId ? cat.nominees.find((n) => n.id === nomineeId) : null
                    return (
                      <li key={cat.id} className="flex items-center justify-between gap-2 font-sans text-body-sm">
                        <span className="text-on-surface-variant truncate">{cat.emoji} {cat.title}</span>
                        <span className={nominee ? 'text-primary' : 'text-outline italic'}>
                          {nominee ? nominee.name : 'Voto em branco'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <p className="font-sans text-body-sm text-on-surface-variant text-center mb-6">
                Seus votos ficam sob sigilo notarial até o reveal.
              </p>

              <Link
                to="/"
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-sans font-bold text-body-md transition-all shadow-[0_0_16px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Concluir e Voltar
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ---- Estado: cédula aberta (fluxo principal) ----
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-12 pt-28 pb-24 relative isolate">
        {/* Camada de glows ambientes (recortada pelo main, atrás do conteúdo) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 right-10 w-80 h-80 bg-tertiary-container/10 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-10 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl" />
        </div>

          {/* ---- Cabeçalho da cédula ---- */}
          <header className="relative bg-surface-container/70 backdrop-blur-xl rounded-xl p-6 sm:p-8 lg:p-10 shadow-xl mb-10">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 rounded-t-xl" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-outline-variant/30">
              <div className="space-y-2 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high text-primary font-sans font-bold text-label-sm uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  Protocolo Soberano • Edição Anual 2025
                </div>
                <h1 className="font-serif font-bold text-headline-lg text-primary tracking-tight">
                  Cédula Oficial de <span className="gold-gradient-text">Votação</span>
                </h1>
                <p className="font-serif italic text-headline-sm text-secondary">
                  Academia da Resenha &amp; Zoeira Suprema
                </p>
                <p className="font-sans text-body-md text-on-surface-variant pt-1 max-w-2xl">
                  Seu voto é 100% secreto, inviolável e auditado diretamente pelo bot. Você pode alterar qualquer indicação livremente até o soar do gongo e o fechamento irrestrito das urnas.
                </p>
              </div>

              {/* Sello oficial visual */}
              <div className="hidden lg:flex flex-col items-center justify-center p-4 rounded-xl bg-surface-container-lowest/80 text-center shadow-md min-w-[170px]">
                <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-2 shadow-[0_0_18px_rgba(212,175,55,0.25)]">
                  <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_vote</span>
                </div>
                <span className="font-sans font-bold text-label-sm text-primary tracking-widest uppercase">Criptografia</span>
                <span className="font-sans text-body-sm text-outline">Ponta-a-Zoeira 256-bit</span>
              </div>
            </div>

            {/* Franja de estado del votante + telemetría */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              {/* Eleitor habilitado */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-surface-container-low shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-sans font-bold text-label-sm text-outline uppercase tracking-wider">Eleitor Habilitado</span>
                    <span className="font-sans font-semibold text-title-md text-on-surface truncate">@{user?.username}</span>
                  </div>
                </div>
              </div>

              {/* Fechamento das urnas (mini-countdown) */}
              <div className="flex items-center gap-3 p-3.5 rounded-lg bg-surface-container-low shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">timer</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-sans font-bold text-label-sm text-outline uppercase tracking-wider">Fechamento das Urnas</span>
                  <div className="flex items-center gap-1.5 font-sans font-bold text-title-md text-primary tracking-tight">
                    <span>{countdown}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  </div>
                </div>
              </div>

              {/* Progresso da cédula */}
              <div className="flex flex-col justify-center p-3.5 rounded-lg bg-surface-container-low shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-sans font-bold text-label-sm text-outline uppercase tracking-wider">Progresso da Cédula</span>
                  <span className="font-sans font-bold text-label-md text-primary">{progress.selected} de {progress.total} Votadas</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-container via-primary to-secondary rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* ---- Grid principal: categorias + sidebar ---- */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Sidebar (mobile: acima das categorias; xl: coluna direita fixa) */}
            <aside className="xl:col-span-4 order-first xl:order-last">
              <div className="xl:sticky xl:top-28 bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                {/* Cabeçalho */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                    <span className="material-symbols-outlined text-[24px]">ballot</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">Cédula em Aberto</span>
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-title-md text-on-surface">{progress.selected} / {progress.total}</span>
                      <span className="font-sans text-body-sm text-outline">categorias seleccionadas</span>
                    </div>
                  </div>
                </div>

                {/* Barra de progresso fina dourada */}
                <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden mb-5">
                  <div
                    className="h-full bg-gradient-to-r from-primary-fixed via-primary to-primary-container rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Lista das seleções atuais */}
                <div className="flex flex-col gap-2 mb-5">
                  {categories.map((cat) => {
                    const nomineeId = selection[cat.id]
                    const nominee = nomineeId ? cat.nominees.find((n) => n.id === nomineeId) : null
                    return (
                      <div key={cat.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/30">
                        <span className="font-sans text-body-sm text-on-surface-variant truncate">{cat.emoji} {cat.title}</span>
                        <span className={`font-sans text-body-sm truncate ${nominee ? 'text-primary' : 'text-outline'}`}>
                          {nominee ? nominee.name : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={resetSelection}
                    disabled={progress.selected === 0}
                    className="w-full py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-sans font-medium text-body-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Limpar Seleções
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    disabled={progress.selected === 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-body-md shadow-[0_0_24px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                    Confirmar e Selar Meus Votos
                  </button>
                </div>
              </div>
            </aside>

            {/* Coluna principal: categorias */}
            <section className="xl:col-span-8 flex flex-col gap-6">
              {categories.map((cat, i) => (
                <CategorySection
                  key={cat.id}
                  index={i + 1}
                  category={cat}
                  selection={selection[cat.id]}
                  onToggle={toggleSelection}
                  isSelfVote={isSelfVote}
                />
              ))}
            </section>
          </div>
      </main>
      <Footer />

      {/* Modal de confirmação do selo */}
      <ConfirmModal
        open={modalOpen}
        categories={categories}
        selection={selection}
        onCancel={() => setModalOpen(false)}
        onConfirm={() => {
          sealVotes()
          setModalOpen(false)
        }}
      />
    </div>
  )
}