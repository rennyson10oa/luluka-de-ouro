import { useEffect, useMemo, useState } from 'react'
import useGalaState from '../hooks/useGalaState'

/**
 * Contagem regressiva para o reveal.
 *
 * Fase 2 (ADR-0002): o alvo vem de GET /api/state via useGalaState
 * (substitui o antigo localStorage 'pg_reveal_at'). Se o cartório ainda não
 * agendou (reveal_at nulo/inválido/passado), usa o mock de 4 dias como
 * fallback visual — apenas exibição.
 */
const MOCK_REVEAL_OFFSET_MS = (4 * 24 * 3600 + 18 * 3600 + 42 * 60 + 15) * 1000

/** Alvo exibido: reveal_at real (se futuro) ou mock +4d. */
function resolveTarget(revealAt, mockFallback) {
  if (revealAt && revealAt.getTime() > Date.now()) return revealAt
  return mockFallback
}

function CountdownUnit({ value, label }) {
  const padded = String(value).padStart(2, '0')
  return (
    <div className="relative group rounded-2xl bg-surface-container/85 backdrop-blur-xl p-space-lg flex flex-col items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.6)] hover:shadow-[0_0_28px_rgba(212,175,55,0.2)] transition-all duration-300">
      {/* Gold top accent */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
      {/* Number */}
      <div className="w-full text-center pb-2 relative">
        <span className="font-sans font-bold text-[52px] leading-[60px] tracking-tight text-on-surface tabular-nums">
          {padded}
        </span>
        {/* Middle divider line (flip-card aesthetic) */}
        <div className="w-full h-[1px] bg-surface-variant/70 absolute top-1/2 left-0" />
      </div>
      <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest mt-2">
        {label}
      </span>
    </div>
  )
}

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const { revealAt } = useGalaState()
  // Fallback estável (não recalcula a cada render).
  const [mockFallback] = useState(() => new Date(Date.now() + MOCK_REVEAL_OFFSET_MS))
  const targetDate = useMemo(() => resolveTarget(revealAt, mockFallback), [revealAt, mockFallback])

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, targetDate - Date.now())
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft({ days, hours, minutes, seconds })
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return (
    <section className="w-full px-6 lg:px-12 py-12 flex flex-col items-center bg-surface-container-lowest/60 relative">
      {/* Section header */}
      <div className="flex items-center gap-space-sm mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <h2 className="font-sans font-bold text-label-md text-secondary uppercase tracking-[0.25em]">
          CONTAGEM REGRESSIVA PARA O REVEAL AO VIVO
        </h2>
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
      </div>

      {/* Flip-card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md w-full max-w-3xl mx-auto">
        <CountdownUnit value={timeLeft.days} label="Dias" />
        <CountdownUnit value={timeLeft.hours} label="Horas" />
        <CountdownUnit value={timeLeft.minutes} label="Minutos" />
        <CountdownUnit value={timeLeft.seconds} label="Segundos" />
      </div>

      {/* Sync status label */}
      <div className="mt-6 flex items-center gap-2 text-center text-on-surface-variant font-sans text-body-sm">
        <span className="material-symbols-outlined text-[16px] text-secondary">timer</span>
        <span>Sincronizado com o cartório — as urnas fecham automaticamente no horário oficial</span>
      </div>
    </section>
  )
}
