/**
 * RevealCard — card central da cerimônia com dois estágios:
 *
 * 1. SUSPENSE: "E o vencedor é..." com pontinhos pulsando + botão de revelar.
 * 2. REVELADO: vencedor em destaque (ouro), reações, pódio lateral
 *    (🥈🥉🎖️) e menção honrosa — fiel ao design do Stitch.
 *
 * A transição suspense→revelado dá um shake no card (animate-shake do index.css).
 *
 * NOTA DE ARQUITETURA: o antigo "player de áudio de evidência" (decorativo,
 * herança do mock HTML) foi removido — decisão registrada: a gala é à base
 * de texto (pitch/comentário); mídia de evidência foi REJEITADA por custo de
 * infra/superfície de ataque sem caso de uso real. Se um dia uma categoria
 * pedir prova, o caminho barato é LINK de evidência (URL no pitch), nunca
 * upload de mídia.
 */

export default function RevealCard({ category, revealed, onReveal }) {
  const { podium } = category
  const first = podium.first

  // ---------------------- ESTÁGIO 1: SUSPENSE ----------------------
  if (!revealed) {
    return (
      <div className="relative bg-surface-container-low/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_45px_rgba(212,175,55,0.15)] text-center overflow-hidden animate-pulse">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
        <span className="text-6xl" aria-hidden="true">{category.emoji}</span>
        <h1 className="font-serif font-bold text-headline-lg text-on-surface tracking-tight mt-4">
          {category.title}
        </h1>
        <p className="font-sans text-body-md text-on-surface-variant italic mt-2 max-w-xl mx-auto">
          {category.quote}
        </p>

        {/* Suspense: três pontos pulsando em cascata */}
        <div className="flex items-center justify-center gap-3 my-10" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="font-sans font-bold text-title-lg text-primary uppercase tracking-[0.25em]">
          E o vencedor é...
        </p>

        {onReveal ? (
          <button
            type="button"
            onClick={onReveal}
            className="mt-8 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-title-md shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:shadow-[0_0_45px_rgba(212,175,55,0.7)] hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">emoji_events</span>
            Revelar Vencedor
          </button>
        ) : (
          // Cerimônia dirigida: ninguém aqui comanda — o botão seria morto.
          <p className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-container-highest/80 text-outline font-sans text-body-sm">
            <span className="material-symbols-outlined text-[18px]">theater_comedy</span>
            Aguardando o mestre de cerimônias revelar...
          </p>
        )}
      </div>
    )
  }

  // ---------------------- ESTÁGIO 2: REVELADO ----------------------
  return (
    <div className="relative bg-surface-container-low/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_45px_rgba(212,175,55,0.2)] overflow-hidden animate-shake">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

      {/* Linha de auditoria */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest/80 text-outline font-sans font-bold text-label-sm uppercase tracking-widest">
          <span className="material-symbols-outlined text-[14px] text-primary">workspace_premium</span>
          Votação Auditada pelo Cartório do Discord
        </span>
        <span className="px-3 py-1 rounded-full bg-primary text-on-primary font-sans font-bold text-label-sm uppercase tracking-widest">
          🥇 OURO 2026
        </span>
      </div>

      <div className="text-center">
        <h1 className="font-serif font-bold text-headline-md text-primary tracking-tight">
          {category.title}
        </h1>
        <p className="font-sans text-body-md text-on-surface-variant italic mt-1">{category.quote}</p>

        {/* Números do vencedor */}
        <p className="font-serif font-bold text-[40px] leading-none gold-gradient-text mt-6">
          🥇 {first.pct} dos Votos Populares
        </p>
        <p className="font-sans text-body-sm text-outline mt-1">
          {first.votes.replace(' Votos', '')} confirmações na urna
        </p>

        {/* Nome do vencedor */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <span className="w-14 h-14 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <span className="material-symbols-outlined text-primary text-[28px]">{first.icon}</span>
          </span>
          <div className="text-left">
            <h2 className="font-serif font-bold text-title-lg text-on-surface">"{first.memeName}"</h2>
            <p className="font-sans text-body-sm text-outline">{first.realName}</p>
          </div>
        </div>

        {/* Reações (texto real vindo do pódio) */}
        <div className="max-w-md mx-auto mt-6 flex justify-center">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-error-container/20 border border-error/30 text-error font-sans font-bold text-label-sm uppercase tracking-widest">
            <span className="material-symbols-outlined text-[16px]">sentiment_very_dissatisfied</span>
            {first.reactions}
          </div>
        </div>
      </div>

      {/* Pódio lateral: 🥈 / 🥉 / 🎖️ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
        {[
          { medal: '🥈', label: `2º LUGAR (${podium.second.pct})`, item: podium.second },
          { medal: '🥉', label: `3º LUGAR (${podium.third.pct})`, item: podium.third },
          { medal: '🎖️', label: 'MENÇÃO HONROSA', item: podium.honorable },
        ].map(({ medal, label, item }) => (
          <div
            key={label}
            className="flex flex-col gap-1.5 p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30"
          >
            <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-wider">
              {medal} {label}
            </span>
            <h4 className="font-serif font-bold text-title-md text-on-surface">"{item.memeName}"</h4>
            <p className="font-sans text-body-sm text-on-surface-variant">{item.votes}</p>
            <p className="font-sans text-[11px] text-outline leading-tight">{item.detail}</p>
          </div>
        ))}
      </div>

      {/* Menção honrosa */}
      <p className="mt-4 text-center font-sans text-body-sm text-outline">
        Menção honrosa registrada em ata com todo o respeito (e nenhum).
      </p>
    </div>
  )
}
