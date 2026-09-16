import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { Footer } from '../components/Footer'
import RevealCard from '../components/reveal/RevealCard'
import RevealChat from '../components/reveal/RevealChat'
import ConfettiCanvas from '../components/reveal/ConfettiCanvas'
import { RESULT_CATEGORIES, RESULTS_META } from '../data/mockResults'

const REVEAL_KEY = 'pg_reveal_at'

/** true se o reveal está agendado para o FUTURO (cerimônia trancada). */
function computeIsLocked() {
  try {
    const saved = localStorage.getItem(REVEAL_KEY)
    if (!saved) return false
    const d = new Date(saved)
    return !Number.isNaN(d.getTime()) && d.getTime() > Date.now()
  } catch {
    return false
  }
}

/** Formato "04d 18h 41m 20s" para a contagem da cerimônia. */
function formatCountdown(diff) {
  const pad = (n) => String(n).padStart(2, '0')
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

/** toast simples no padrão do AdminPanel (estado + fixed bottom-right). */
function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  function showToast(msg) {
    setToast(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 3000)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  return { toast, showToast }
}

export default function RevealPage() {
  const [isLocked, setIsLocked] = useState(() => computeIsLocked())
  const [rehearsal, setRehearsal] = useState(false) // modo ensaio: destrava sem tocar storage
  const [countdown, setCountdown] = useState('')

  // Máquina de estágios da cerimônia
  const [catIndex, setCatIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [autoplay, setAutoplay] = useState(false)

  const confettiRef = useRef(null)
  const { toast, showToast } = useToast()

  const total = RESULT_CATEGORIES.length
  const category = RESULT_CATEGORIES[catIndex]
  const isFinale = catIndex === total - 1 && revealed
  const revealedCount = catIndex + (revealed ? 1 : 0)
  const progressPct = Math.round((revealedCount / total) * 100)

  // Contagem regressiva no estado trancado
  useEffect(() => {
    if (!isLocked || rehearsal) return undefined
    let target
    try {
      target = new Date(localStorage.getItem(REVEAL_KEY))
    } catch {
      target = new Date()
    }
    function tick() {
      setCountdown(formatCountdown(Math.max(0, target - Date.now())))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isLocked, rehearsal])

  // Confete no momento do reveal
  function revealCurrent() {
    setRevealed(true)
    confettiRef.current?.fire(140)
  }

  // Navegação entre categorias (reset do estágio suspense)
  function goNext() {
    if (catIndex < total - 1) {
      setCatIndex((i) => i + 1)
      setRevealed(false)
    }
  }
  function goPrev() {
    if (catIndex > 0) {
      setCatIndex((i) => i - 1)
      setRevealed(false)
    }
  }

  // Autoplay: suspense → revela; revelado → avança (com cleanup rigoroso)
  useEffect(() => {
    if (!autoplay || isLocked) return undefined
    const delay = revealed ? 4000 : 3000
    const id = setTimeout(() => {
      if (!revealed) {
        revealCurrent()
      } else if (catIndex < total - 1) {
        goNext()
      } else {
        // Fim da fila: desliga o autoplay no finale
        setAutoplay(false)
      }
    }, delay)
    return () => clearTimeout(id)
  }, [autoplay, revealed, catIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Finale: chuva dupla de confete ao entrar
  useEffect(() => {
    if (isFinale) {
      confettiRef.current?.fire(200)
      const t = setTimeout(() => confettiRef.current?.fire(160), 900)
      return () => clearTimeout(t)
    }
  }, [isFinale])

  // Teclado: Espaço/→ avança estágio, ← volta
  useEffect(() => {
    if (isLocked && !rehearsal) return undefined
    function onKey(e) {
      if (e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault()
        if (!revealed) revealCurrent()
        else goNext()
      } else if (e.code === 'ArrowLeft') {
        goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, catIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------- ESTADO: TRANCADO ----------------------
  if (isLocked && !rehearsal) {
    return (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <Header />
        <main className="flex-grow flex items-center justify-center px-6 pt-24 pb-16">
          <div className="relative w-full max-w-md text-center">
            <div className="absolute inset-0 -z-10 bg-primary/10 blur-[120px] rounded-full" />
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-container flex items-center justify-center shadow-[0_0_24px_rgba(212,175,55,0.3)] mb-6">
              <span className="material-symbols-outlined text-primary text-[32px]">lock</span>
            </div>
            <h1 className="font-serif font-bold text-headline-md text-primary tracking-tight mb-2">
              A Cerimônia Ainda Não Começou
            </h1>
            <p className="font-sans text-body-md text-on-surface-variant mb-6">
              Os sobrescritos estão lacrados no cartório. Volte quando o relógio zerar.
            </p>
            <p className="font-serif font-bold text-[36px] text-on-surface tabular-nums mb-8">{countdown}</p>
            <div className="flex items-center justify-center gap-space-sm">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans font-semibold text-title-md transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Voltar ao Início
              </Link>
              <button
                type="button"
                onClick={() => setRehearsal(true)}
                className="text-outline hover:text-secondary font-sans text-body-sm underline underline-offset-4 transition-colors"
              >
                entrar em modo ensaio
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ---------------------- ESTADO: CERIMÔNIA ----------------------
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <ConfettiCanvas ref={confettiRef} />
      <Header />

      {/* Barra de controles (sticky sob o header) */}
      <div className="sticky top-20 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-error-container/20 border border-error/40 text-error font-sans font-bold text-label-sm uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
            REVEAL AO VIVO
          </span>

          {/* Toggle autoplay */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="font-sans text-body-sm text-on-surface-variant">Autoplay</span>
            <span className="relative inline-flex w-10 h-5 rounded-full bg-surface-container-high transition-colors peer">
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => setAutoplay(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-surface-container-high peer-checked:bg-primary transition-colors" />
              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-on-surface-variant peer-checked:bg-on-primary peer-checked:translate-x-5 transition-transform" />
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-outline font-sans text-body-sm">
              <span className="material-symbols-outlined text-[16px]">keyboard</span>
              Espaço: Próximo
            </span>
            {!revealed && (
              <button
                type="button"
                onClick={revealCurrent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-sans font-semibold text-body-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">fast_forward</span>
                Pular Suspense
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-24">
        {/* Progresso da cerimônia */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8">
          <span className="font-sans font-bold text-label-md text-secondary uppercase tracking-widest">
            {progressPct}% das Vergonhas Reveladas
          </span>
          {/* Dots: concluída (check) / atual (dourada) / futura (outline) */}
          <div className="flex items-center gap-2">
            {RESULT_CATEGORIES.map((cat, i) => {
              const done = i < catIndex || (i === catIndex && revealed)
              const current = i === catIndex
              return (
                <span
                  key={cat.id}
                  title={cat.title}
                  className={`w-8 h-2 rounded-full transition-all duration-300 ${
                    done
                      ? 'bg-emerald-500'
                      : current
                        ? 'bg-primary animate-pulse'
                        : 'bg-surface-container-high'
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Card da cerimônia + chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <RevealCard key={catIndex} category={category} revealed={revealed} onReveal={revealCurrent} />

            {/* Finale */}
            {isFinale && (
              <div className="mt-6 text-center bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-6 border border-primary/30">
                <h2 className="font-serif font-bold text-headline-sm text-primary mb-3">
                  Fim da Cerimônia! 🏆
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/resultados"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-title-md shadow-[0_0_24px_rgba(212,175,55,0.4)] hover:brightness-110 transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">photo_library</span>
                    Ver Galeria de Resultados
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setCatIndex(0); setRevealed(false) }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans font-semibold text-title-md transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">replay</span>
                    Rever do Começo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Chat ao vivo (ativo quando a categoria está revelada) */}
          <aside className="lg:col-span-4">
            <RevealChat active={revealed} />
          </aside>
        </div>

        {/* Navegação inferior */}
        <div className="flex items-center justify-between mt-10">
          <button
            type="button"
            onClick={goPrev}
            disabled={catIndex === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans font-semibold text-body-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            Anterior
          </button>

          {catIndex < total - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans font-semibold text-body-md transition-all"
            >
              Próxima: {RESULT_CATEGORIES[catIndex + 1].navLabel}
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          ) : (
            <span className="font-sans text-body-sm text-outline">Última categoria da gala</span>
          )}
        </div>
      </main>

      {/* Botão flutuante de confete */}
      <button
        type="button"
        onClick={() => confettiRef.current?.fire(100)}
        title="Jogar Confete"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-body-md shadow-[0_0_24px_rgba(212,175,55,0.45)] hover:brightness-110 hover:scale-105 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">celebration</span>
        Jogar Confete!
      </button>

      <Footer />

      {toast && (
        <div className="fixed bottom-24 right-6 z-50 bg-surface-container-highest/95 backdrop-blur-xl px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-primary-container/30">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span className="font-sans text-body-md text-on-surface">{toast}</span>
        </div>
      )}
    </div>
  )
}
