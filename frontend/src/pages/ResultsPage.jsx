import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { Footer } from '../components/Footer'
import PodiumBlock from '../components/results/PodiumBlock'
import useGalaState from '../hooks/useGalaState'
import apiFetch from '../utils/api'
import { RESULTS_META, GALLERY_STATS, FUN_STATS } from '../data/mockResults'

/**
 * Emoji de exibição por palavra-chave do título. A API /api/results não expõe
 * emoji; usamos um fallback cosmético (Fase 3 pode trazer o emoji no payload).
 */
function emojiForTitle(title) {
  const t = String(title || '').toLowerCase()
  if (t.includes('participa')) return '🎭'
  if (t.includes('pataquada')) return '🤡'
  if (t.includes('mitada')) return '👑'
  if (t.includes('qi') || t.includes('temperatura')) return '🌡️'
  return '🏆'
}

/** Entrada neutra para pódios incompletos (0, 1 ou 2 concorrentes). */
const EMPTY_PODIUM_ENTRY = {
  memeName: '—',
  realName: '',
  icon: 'workspace_premium',
  pct: '0%',
  votes: '0 Votos',
  detail: '',
  crimeLabel: 'Pitch de Campanha:',
  crimeDetail: 'Sem pitch registrado.',
  badge: 'Aguardando votos',
}

/**
 * mapResultToCategory — converte GET /api/results
 * ({ category_id, title, podium:[{user_id, username, votes, pitch}] }) no shape
 * que o PodiumBlock consome ({ id, emoji, badge, title, validVotes, podium:{first,
 * second, third, honorable} }). Percentuais são calculados sobre a soma local.
 */
function mapResultToCategory(result) {
  const podium = Array.isArray(result.podium) ? result.podium : []
  const total = podium.reduce((sum, item) => sum + (Number(item.votes) || 0), 0)
  const pct = (votes) => (total > 0 ? `${(((Number(votes) || 0) / total) * 100).toFixed(1)}%` : '0%')

  const toEntry = (item, isFirst) => {
    if (!item) return { ...EMPTY_PODIUM_ENTRY }
    const votes = Number(item.votes) || 0
    const pitch = item.pitch || ''
    return {
      memeName: item.username || 'Indicado',
      realName: '',
      icon: 'workspace_premium',
      pct: pct(votes),
      votes: `${votes.toLocaleString('pt-BR')} ${votes === 1 ? 'Voto' : 'Votos'}`,
      detail: pitch,
      crimeLabel: 'Pitch de Campanha:',
      crimeDetail: pitch || 'Sem pitch registrado.',
      badge: isFirst ? 'Consagrado em Ata' : '',
    }
  }

  const fourth = podium[3]

  return {
    id: `categoria-${result.category_id}`,
    emoji: emojiForTitle(result.title),
    badge: 'Ata Homologada',
    title: result.title,
    validVotes: `${total.toLocaleString('pt-BR')} ${total === 1 ? 'Voto Válido' : 'Votos Válidos'}`,
    quote: '',
    navLabel: result.title,
    podium: {
      first: toEntry(podium[0], true),
      second: toEntry(podium[1], false),
      third: toEntry(podium[2], false),
      honorable: fourth
        ? {
            memeName: fourth.username || 'Indicado',
            votes: `${Number(fourth.votes) || 0} ${Number(fourth.votes) === 1 ? 'voto' : 'votos'}`,
            detail: fourth.pitch || '',
          }
        : null,
    },
  }
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
function CategoryFilter({ categories, active, onChange }) {
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
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onChange(cat.id)}
          className={pillClasses(active === cat.id)}
        >
          <span aria-hidden="true">{cat.emoji}</span>
          {cat.title}
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
 * Pública (sem guard de login). Fase 2 (ADR-0002): o bloqueio e os pódios vêm
 * do servidor — trancada quando a votação está aberta e o reveal ainda não
 * passou (espelha o 403 do GET /api/results); destrancada, busca /api/results.
 */
export default function ResultsPage() {
  // Estado global da gala (fonte de verdade do bloqueio e do reveal).
  const { votacaoAberta, revealAt, loading: loadingGala } = useGalaState()
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [results, setResults] = useState(null)
  const [loadError, setLoadError] = useState('')

  // Trancada quando a votação está aberta E (sem reveal agendado OU reveal no
  // futuro) — espelha exatamente a regra de 403 do GET /api/results.
  const isLocked = !loadingGala && votacaoAberta && (!revealAt || revealAt.getTime() > now)

  // Destrava sozinho quando o relógio do reveal passa — sem exigir reload
  // (mesmo comportamento do RevealPage; reportado no ensaio da Task 11).
  useEffect(() => {
    if (loadingGala || !isLocked) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isLocked, loadingGala])

  // Busca os resultados reais quando a galeria está destrancada.
  useEffect(() => {
    if (loadingGala || isLocked) return undefined
    let cancelled = false
    ;(async () => {
      const res = await apiFetch('/api/results')
      if (cancelled) return
      if (res.ok && Array.isArray(res.data)) {
        setResults(res.data)
        setLoadError('')
      } else if (res.status === 403) {
        setLoadError('Resultados sob sigilo notarial até a cerimônia.')
      } else {
        setLoadError('Falha na comunicação com o cartório. Tente recarregar a página.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLocked, loadingGala])

  // Categorias a exibir (shape do PodiumBlock) derivadas da API.
  const resultCategories = useMemo(
    () => (results ? results.map(mapResultToCategory) : []),
    [results]
  )

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
      ? resultCategories
      : resultCategories.filter((cat) => cat.id === activeFilter)

  // O número da categoria vem da posição original no dataset
  // (assim, filtrar uma categoria continua mostrando "Categoria 0N").
  function categoryNumber(cat) {
    return resultCategories.findIndex((c) => c.id === cat.id) + 1
  }

  // ---- Estado: estado global da gala ainda carregando ----
  // Evita o flash de "trancado" antes do /api/state responder.
  if (loadingGala) {
    return (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-28">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
            <span className="font-sans text-body-sm text-on-surface-variant">Consultando o cartório...</span>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ---- Estado TRANCADO: cerimônia pendente (votação aberta sem reveal passado) ----
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

          {/* Filtro de categorias (só quando há resultados reais) */}
          {resultCategories.length > 0 && (
            <CategoryFilter
              categories={resultCategories}
              active={activeFilter}
              onChange={setActiveFilter}
            />
          )}

          {/* Pódios por categoria — dados de GET /api/results */}
          <div className="flex flex-col gap-space-xl">
            {loadError ? (
              <div className="mx-auto max-w-lg text-center bg-surface-container-low/70 backdrop-blur-xl border border-outline-variant/30 rounded-2xl p-8">
                <span className="material-symbols-outlined text-primary text-[40px] mb-2">hourglass_top</span>
                <p className="font-sans text-body-md text-on-surface-variant">{loadError}</p>
              </div>
            ) : !results ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
                <span className="font-sans text-body-sm text-on-surface-variant">Apurando os votos no cartório...</span>
              </div>
            ) : filteredCategories.length === 0 ? (
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