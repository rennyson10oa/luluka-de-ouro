import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { Footer } from '../components/Footer'
import PodiumBlock from '../components/results/PodiumBlock'
import {
  RESULTS_META,
  GALLERY_STATS,
  RESULT_CATEGORIES,
  FUN_STATS,
} from '../data/mockResults'

// Chave de agendamento do reveal, escrita pelo painel admin (AdminPanel).
const REVEAL_KEY = 'pg_reveal_at'

/**
 * computeIsLocked — mesma semântica da helper computeIsClosed dos hooks
 * existentes (copiada, não importada), mas invertida para a galeria:
 * pg_reveal_at definido E ainda no futuro → cerimônia pendente → galeria
 * trancada. Ausente, inválida ou passada → galeria aberta.
 */
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

// Nomes curtos das pills de filtro (enxutos no mobile), coerentes com o Stitch:
// Participação Especial, Pataquadas, Mitadas, QI Ambiente.
const FILTER_SHORT_NAMES = {
  'participacao-especial': 'Participação Especial',
  'pataquadas': 'Pataquadas',
  'mitadas': 'Mitadas',
  'qi-ambiente': 'QI Ambiente',
}

/**
 * ResultsHero — selo notarial + título de gala + ações (PDF / Compartilhar).
 */
function ResultsHero({ onDownload, onShare }) {
  return (
    <section className="flex flex-col items-center text-center gap-4 pt-4">
      {/* Selo notarial homologado (verde suave) */}
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-sans font-semibold text-label-sm uppercase tracking-widest shadow-[0_0_16px_rgba(52,211,153,0.12)]">
        <span className="material-symbols-outlined text-[18px]">verified</span>
        {RESULTS_META.seal}
      </span>

      {/* Título de gala */}
      <h1 className="font-serif font-bold text-display-lg-mobile lg:text-display-lg leading-none tracking-tight max-w-4xl">
        Galeria Oficial de{' '}
        <span className="gold-gradient-text">Resultados {RESULTS_META.edition}</span>
      </h1>

      {/* Ações: PDF (ghost) + Compartilhar (dourado) */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans font-semibold text-title-md transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-secondary text-[20px]">picture_as_pdf</span>
          Baixar Relatório em PDF
        </button>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-title-md shadow-[0_0_24px_rgba(212,175,55,0.35)] hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">share</span>
          Compartilhar no Zap / Discord
        </button>
      </div>
    </section>
  )
}

/**
 * GalleryStatCard — card de métrica da galeria (padrão StatCard do AdminPanel,
 * recriado localmente para não acoplar a página ao painel).
 */
function GalleryStatCard({ icon, label, value, detail }) {
  return (
    <div className="bg-surface-container/90 backdrop-blur-md rounded-2xl p-5 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.6),0_0_20px_0_rgba(212,175,55,0.06)] relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">{label}</span>
        <span className="material-symbols-outlined text-primary text-[22px]">{icon}</span>
      </div>
      <p className="font-serif font-bold text-display-lg-mobile leading-none text-primary">{value}</p>
      <p className="font-sans text-body-sm text-on-surface-variant mt-2">{detail}</p>
      <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-3">
        <div className="bg-primary h-full rounded-full w-full" />
      </div>
    </div>
  )
}

/**
 * FunStatCard — card das curiosidades da apuração (Bastidores da Votação).
 */
function FunStatCard({ icon, label, value, detail }) {
  return (
    <div className="bg-surface-container/90 backdrop-blur-md rounded-2xl p-5 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.6),0_0_20px_0_rgba(212,175,55,0.06)] relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center shadow-md mb-4">
        <span className="material-symbols-outlined text-primary text-[26px]">{icon}</span>
      </div>
      <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">{label}</span>
      <p className="font-serif font-bold text-headline-sm text-on-surface mt-1">{value}</p>
      <p className="font-sans text-body-sm text-on-surface-variant mt-2">{detail}</p>
    </div>
  )
}

/**
 * CategoryFilter — pills horizontais de filtro por categoria.
 * Mobile: rolagem horizontal (overflow-x-auto, sem wrap). Desktop: wrap.
 */
function CategoryFilter({ active, onChange }) {
  function pillClasses(isActive) {
    const base = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-sans font-semibold text-title-md transition-all shrink-0 whitespace-nowrap'
    if (isActive) {
      return `${base} bg-primary text-on-primary shadow-[0_0_12px_rgba(212,175,55,0.25)]`
    }
    return `${base} bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface`
  }

  return (
    <nav
      aria-label="Filtro de Categorias"
      className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 md:flex-wrap md:overflow-visible"
    >
      <button type="button" onClick={() => onChange('all')} className={pillClasses(active === 'all')}>
        Todas as Categorias
      </button>
      {RESULT_CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onChange(cat.id)}
          className={pillClasses(active === cat.id)}
        >
          <span aria-hidden="true">{cat.emoji}</span>
          {FILTER_SHORT_NAMES[cat.id] || cat.title}
        </button>
      ))}
    </nav>
  )
}

/**
 * BehindTheScenes — seção "Bastidores da Votação" com as curiosidades da apuração.
 */
function BehindTheScenes() {
  return (
    <section className="bg-surface-container-lowest/60 rounded-3xl p-6 sm:p-10 flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center items-center">
        <span className="font-sans font-bold text-label-sm uppercase tracking-widest text-secondary">
          Bastidores da Votação
        </span>
        <h2 className="font-serif font-bold text-headline-md text-primary">
          Estatísticas Curiosas da Apuração
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        {FUN_STATS.map((s) => (
          <FunStatCard key={s.label} {...s} />
        ))}
      </div>
    </section>
  )
}

/**
 * FinalCta — brinde de encerramento + navegação de saída.
 */
function FinalCta({ onReplay }) {
  return (
    <section className="relative overflow-hidden rounded-3xl shadow-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-primary/15 via-surface-container-low to-surface-container-lowest border border-primary-container/20">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/10 blur-[90px] rounded-full pointer-events-none" />
      <span className="material-symbols-outlined text-primary text-[42px]">celebration</span>
      <h2 className="font-serif font-bold text-headline-md text-on-surface tracking-wide leading-tight">
        Um Brinde à Próxima Temporada 🥂
      </h2>
      <p className="font-sans text-body-md text-on-surface-variant max-w-xl">
        Que 2026 traga vergonhas ainda mais cinematográficas, áudios ainda mais longos e prints ainda mais comprometedores.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans font-semibold text-title-md transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">home</span>
          Voltar ao Início
        </Link>
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-title-md shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">play_circle</span>
          Rever Cerimônia Completa
        </button>
      </div>
    </section>
  )
}

/**
 * ResultsPage — Galeria de Resultados Oficiais (/resultados).
 * Pública (sem guard de login). Trancada apenas se pg_reveal_at está no
 * futuro (cerimônia pendente); ausente ou passada → galeria aberta.
 */
export default function ResultsPage() {
  const [isLocked, setIsLocked] = useState(() => computeIsLocked())
  const [toast, setToast] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  // Destrava sozinho quando o relógio do reveal passa — sem exigir reload
  // (mesmo comportamento do RevealPage; reportado no ensaio da Task 11).
  useEffect(() => {
    if (!isLocked) return undefined
    const id = setInterval(() => {
      if (!computeIsLocked()) setIsLocked(false)
    }, 1000)
    return () => clearInterval(id)
  }, [isLocked])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  // Compartilhar: navigator.share se existir; senão, copia o link para a área de transferência.
  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator
        .share({
          title: `Galeria Oficial de Resultados ${RESULTS_META.edition}`,
          text: 'Ata homologada! Confira os vencedores da gala do grupo.',
          url,
        })
        .then(() => showToast('Compartilhado com sucesso!'))
        .catch(() => {})
      return
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast('Link copiado para a área de transferência!'))
        .catch(() => showToast('Não consegui copiar o link, copia na mão aí'))
    } else {
      showToast('Seu navegador não suporta compartilhamento automático')
    }
  }

  // Categorias visíveis conforme o filtro ativo.
  const filteredCategories =
    activeFilter === 'all'
      ? RESULT_CATEGORIES
      : RESULT_CATEGORIES.filter((cat) => cat.id === activeFilter)

  // O número da categoria vem da posição original no dataset
  // (assim, filtrar "Mitadas" continua mostrando "Categoria 03").
  function categoryNumber(cat) {
    return RESULT_CATEGORIES.findIndex((c) => c.id === cat.id) + 1
  }

  // ---- Estado TRANCADO: cerimônia pendente (pg_reveal_at no futuro) ----
  if (isLocked) {
    return (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <Header />
        <main className="flex-grow relative flex flex-col items-center justify-center px-6 pt-28 pb-16 overflow-hidden">
          {/* Vinheta ambiental dourada */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-primary-container/15 via-primary/10 to-transparent rounded-full blur-[120px] opacity-70" />
            <div className="absolute -top-24 right-1/4 w-[420px] h-[420px] bg-tertiary-container/10 rounded-full blur-[100px]" />
          </div>

          {/* Card central de sigilo notarial */}
          <div className="relative z-10 flex flex-col items-center text-center gap-4 max-w-lg bg-surface-container-low/60 backdrop-blur-xl border border-outline-variant/30 rounded-2xl p-8 shadow-xl">
            <span className="material-symbols-outlined text-primary text-[48px]">lock</span>
            <h1 className="font-serif font-bold text-headline-md text-on-surface">
              A Cerimônia Ainda Não Aconteceu
            </h1>
            <p className="font-sans text-body-sm text-on-surface-variant leading-relaxed">
              Os resultados permanecem sob sigilo notarial até o reveal. Aguarde a contagem regressiva na página inicial.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-title-md shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">home</span>
              Voltar ao Início
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ---- Estado ABERTO: galeria completa ----
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-12 pt-28 pb-24 relative isolate">
        {/* Blobs dourados sutis de fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-primary/10 blur-[130px] rounded-full" />
          <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-tertiary-container/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-10 left-[-5%] w-[450px] h-[450px] bg-primary-container/10 blur-[140px] rounded-full" />
        </div>

        <div className="flex flex-col gap-space-xl">
          {/* Hero */}
          <ResultsHero
            onDownload={() => showToast('O cartório está encadernando o relatório — em breve')}
            onShare={handleShare}
          />

          {/* Métricas principais */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {GALLERY_STATS.map((s) => (
              <GalleryStatCard key={s.label} {...s} />
            ))}
          </section>

          {/* Filtro de categorias */}
          <CategoryFilter active={activeFilter} onChange={setActiveFilter} />

          {/* Pódios por categoria */}
          <div className="flex flex-col gap-space-xl">
            {filteredCategories.length === 0 ? (
              <p className="text-center font-sans text-body-sm text-on-surface-variant">
                Nenhuma categoria encontrada para este filtro.
              </p>
            ) : (
              filteredCategories.map((cat) => (
                <PodiumBlock key={cat.id} category={cat} index={categoryNumber(cat)} />
              ))
            )}
          </div>

          {/* Bastidores da votação */}
          <BehindTheScenes />

          {/* CTA final */}
          <FinalCta onReplay={() => showToast('A gravação oficial da cerimônia chega com a sprint do reveal')} />
        </div>
      </main>
      <Footer />

      {/* Toast (padrão AdminPanel/ProfilePage) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-highest/95 backdrop-blur-xl px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-primary-container/30">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span className="font-sans text-body-md text-on-surface">{toast}</span>
        </div>
      )}
    </div>
  )
}