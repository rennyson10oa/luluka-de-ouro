import { useEffect, useState } from 'react'

/**
 * useFadeIn — entrada suave do pódio.
 * Alterna a opacidade/translação após o mount usando apenas classes de
 * transição do Tailwind (nada de framer-motion).
 */
function useFadeIn() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  return visible
}

/**
 * PodiumBlock — bloco de categoria com pódio 2º/1º/3º + menção honrosa.
 *
 * Orden visual:
 *   - Mobile (grid-cols-1): 1º primeiro (order-1), depois 2º (order-2) e 3º (order-3).
 *   - Desktop (lg:grid-cols-3): 2º | 1º | 3º via lg:order-1 / lg:order-2 / lg:order-3.
 *
 * Props:
 *   - category: item de RESULT_CATEGORIES (mockResults.js).
 *   - index: número 1-based da categoria no dataset (rótulo "Categoria 0N").
 */
export default function PodiumBlock({ category, index }) {
  const visible = useFadeIn()
  const { first, second, third, honorable } = category.podium
  const categoryNumber = String(index).padStart(2, '0')

  return (
    <article
      id={category.id}
      className={`flex flex-col gap-6 p-6 lg:p-10 rounded-2xl bg-surface-container-low/70 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_28px_rgba(212,175,55,0.06)] transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {/* ---- Cabeçalho da categoria ---- */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[28px]" aria-hidden="true">{category.emoji}</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-label-sm uppercase tracking-widest text-secondary">
              Categoria {categoryNumber} • {category.badge}
            </span>
          </div>
          <h2 className="font-serif font-bold text-headline-md text-primary tracking-tight">
            {category.title}
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded-full self-start md:self-auto">
          <span className="material-symbols-outlined text-primary text-[18px]">poll</span>
          <span className="font-sans font-semibold text-label-md text-on-surface">{category.validVotes}</span>
        </div>
      </header>

      {/* ---- Pódio ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md items-end">
        {/* 1º LUGAR (Ouro — central e imponente) */}
        <div className="order-1 lg:order-2 flex flex-col items-center gap-3 text-center border-2 border-primary rounded-2xl p-6 shadow-[0_0_35px_rgba(212,175,55,0.25)] bg-gradient-to-b from-primary/15 to-surface-container-low/90 backdrop-blur-xl -translate-y-2 hover:-translate-y-3 transition-transform">
          {/* Coroa + pill dourada */}
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[32px]">stars</span>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-on-primary font-sans font-bold text-label-sm uppercase tracking-widest shadow-[0_0_16px_rgba(212,175,55,0.6)]">
              1º Lugar • Vencedor Supremo
            </span>
          </div>

          {/* Percentual gigante */}
          <p className="font-serif font-bold text-[44px] leading-none gold-gradient-text">{first.pct}</p>
          <span className="font-sans text-label-md uppercase tracking-widest text-secondary">{first.votes}</span>

          {/* Avatar circular */}
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <span className="material-symbols-outlined text-primary text-[32px]">{first.icon}</span>
          </div>

          {/* Nome + nome real */}
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-title-lg text-on-surface">{first.memeName}</span>
            <span className="font-sans text-body-sm text-outline mt-0.5">{first.realName}</span>
          </div>

          {/* Caixinha do crime */}
          <div className="w-full bg-surface-container-lowest/70 rounded-xl p-3 flex flex-col gap-1">
            <span className="font-sans text-label-sm uppercase tracking-widest text-secondary font-bold">{first.crimeLabel}</span>
            <p className="font-sans text-body-sm text-on-surface-variant">{first.crimeDetail}</p>
          </div>

          {/* Badge final verde */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-label-sm uppercase tracking-widest font-semibold">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            {first.badge}
          </span>
        </div>

        {/* 2º LUGAR (Prata) */}
        <div className="order-2 lg:order-1 flex flex-col gap-3 p-5 rounded-2xl border border-outline/40 bg-surface-container/90 backdrop-blur-md shadow-lg hover:-translate-y-1 transition-transform">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-outline/40 text-on-surface-variant text-label-sm uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
              2º Lugar • Prata
            </span>
            <span className="font-serif font-bold text-[32px] leading-none text-on-surface">{second.pct}</span>
          </div>
          <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-on-surface-variant text-[28px]">{second.icon}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-title-lg text-on-surface">{second.memeName}</span>
            <span className="font-sans text-body-sm text-secondary">{second.votes}</span>
          </div>
        </div>

        {/* 3º LUGAR (Bronze) */}
        <div className="order-3 flex flex-col gap-3 p-5 rounded-2xl border border-[#cd7f32]/40 bg-surface-container/90 backdrop-blur-md shadow-lg hover:-translate-y-1 transition-transform">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#cd7f32]/40 text-[#cd7f32] text-label-sm uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">military_tech</span>
              3º Lugar • Bronze
            </span>
            <span className="font-serif font-bold text-[28px] leading-none text-[#cd7f32]">{third.pct}</span>
          </div>
          <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-on-surface-variant text-[28px]">{third.icon}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-title-lg text-on-surface">{third.memeName}</span>
            <span className="font-sans text-body-sm text-secondary">{third.votes}</span>
          </div>
        </div>
      </div>

      {/* ---- Menção honrosa ---- */}
      {honorable && (
        <div className="mt-4 bg-surface-container-lowest/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="font-sans text-body-sm text-on-surface">
            <span className="font-sans text-label-sm uppercase tracking-widest text-outline">4º Lugar (Menção Honrosa): </span>
            <span className="font-medium">“{honorable.memeName}” • {honorable.votes}</span>
          </p>
          <p className="font-sans text-body-sm text-on-surface-variant italic">{honorable.detail}</p>
        </div>
      )}
    </article>
  )
}