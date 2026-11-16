import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { Footer } from '../components/Footer'
import PodiumBlock from '../components/results/PodiumBlock'
import useGalaState from '../hooks/useGalaState'
import useGalaEvents from '../hooks/useGalaEvents'
import apiFetch from '../utils/api'

/**
 * RESULTS_COPY — copy de MARCA da galeria. NÃO é dado falso: títulos, selo e
 * edição são textos editoriais fixos da página. A DATA da cerimônia, ao
 * contrário, é dado REAL (derivada de reveal_at em GET /api/state) e é
 * exibida separadamente no hero.
 */
const RESULTS_COPY = {
  edition: '2025',
  seal: 'Ata Notarial Homologada • Votação Encerrada',
}

/** Contadores reais: número vira "1.482"; ausência vira "—". */
function formatCount(value) {
  return typeof value === 'number' ? value.toLocaleString('pt-BR') : '—'
}

/** Data da gala a partir do reveal_at real; texto neutro quando não agendada. */
function formatGalaDate(revealAt) {
  if (!revealAt) return 'Data a definir pela comissão'
  return revealAt.toLocaleString('pt-BR')
}

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

  // 4º lugar (menção honrosa): hoje o GET /api/results devolve apenas os 3
  // primeiros (podium[:3]); ainda assim o mapping é defensivo para quando/se o
  // backend ampliar o recorte.
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
            votes: `${Number(fourth.votes) || 0} ${Number(fourth.votes) === 1 ? 'voto' : 'votos'} (${pct(fourth.votes)})`,
            detail: fourth.pitch || '',
          }
        : null,
    },
  }
}

/**
 * analyzeResults — extrai números reais por categoria a partir de
 * GET /api/results. Cada item traz votos somados, margem 1º→2º (em pontos
 * percentuais DENTRO da categoria) e o nome do vencedor.
 */
function analyzeResults(results) {
  const source = Array.isArray(results) ? results : []
  return source.map((result) => {
    const podium = Array.isArray(result.podium) ? result.podium : []
    const total = podium.reduce((sum, item) => sum + (Number(item.votes) || 0), 0)
    const firstVotes = Number(podium[0]?.votes) || 0
    const secondVotes = Number(podium[1]?.votes) || 0
    const pctOf = (votes) => (total > 0 ? (votes / total) * 100 : 0)
    const leaderPct = pctOf(firstVotes)
    const runnerUpPct = pctOf(secondVotes)

    return {
      title: result.title || 'Categoria sem título',
      total,
      hasRunnerUp: podium.length > 1,
      winner: podium[0]?.username || 'Indicado',
      leaderPct,
      runnerUpPct,
      margin: leaderPct - runnerUpPct,
    }
  })
}

/**
 * buildFunStats — curiosidades 100% derivadas de dados reais
 * (GET /api/results + contadores de /api/state/stream). Quando falta base de
 * cálculo, o card anuncia a ausência ("—") em vez de inventar número.
 */
function buildFunStats(categories, totalVotos, totalUsers) {
  const source = Array.isArray(categories) ? categories : []
  const disputadas = source.filter((cat) => cat.hasRunnerUp && cat.total > 0)

  const closest = disputadas.length
    ? disputadas.reduce((best, cat) => (cat.margin < best.margin ? cat : best), disputadas[0])
    : null
  const biggest = disputadas.length
    ? disputadas.reduce((best, cat) => (cat.margin > best.margin ? cat : best), disputadas[0])
    : null

  // Cada eleitor pode votar UMA vez por categoria (UniqueConstraint
  // voter_id+category_id no banco). Logo, urnas possíveis = eleitores × categorias.
  const possibleBallots =
    typeof totalUsers === 'number' && source.length > 0 ? totalUsers * source.length : null
  const participation =
    possibleBallots && possibleBallots > 0 && typeof totalVotos === 'number'
      ? Math.min(100, (totalVotos / possibleBallots) * 100)
      : null

  // Vencedor com MENOR consenso: o 1º lugar com o pior percentual — a vitória
  // mais contestada da noite (distinto de "mais disputada", que mede margem).
  const leastPopular = disputadas.length
    ? disputadas.reduce((worst, cat) => (cat.leaderPct < worst.leaderPct ? cat : worst), disputadas[0])
    : null

  return [
    {
      icon: 'balance',
      label: 'A Mais Disputada',
      value: closest
        ? `${closest.leaderPct.toFixed(1)}% vs ${closest.runnerUpPct.toFixed(1)}%`
        : '—',
      detail: closest
        ? `${closest.title} • margem de ${closest.margin.toFixed(1)} p.p.`
        : 'Aguardando 2º colocado apurado',
    },
    {
      icon: 'waterfall_chart',
      label: 'Maior Lavada Eleitoral',
      value: biggest ? `${biggest.margin.toFixed(1)} p.p.` : '—',
      detail: biggest
        ? `${biggest.winner} • ${biggest.leaderPct.toFixed(1)}% vs ${biggest.runnerUpPct.toFixed(1)}%`
        : 'Aguardando 2º colocado apurado',
    },
    {
      icon: 'psychology',
      label: 'Vitória Mais Contestada',
      value: leastPopular ? `${leastPopular.leaderPct.toFixed(1)}%` : '—',
      detail: leastPopular
        ? `${leastPopular.winner} • só ${leastPopular.leaderPct.toFixed(1)}% acham que foi merecido`
        : 'Aguardando apuração',
    },
    {
      icon: 'pie_chart',
      label: 'Participação nas Urnas',
      value: participation !== null ? `${participation.toFixed(0)}%` : '—',
      detail:
        participation !== null
          ? `${formatCount(totalVotos)} votos de ${formatCount(possibleBallots)} urnas possíveis`
          : 'Sem dados suficientes para o cálculo',
    },
  ]
}

/**
 * ResultsHero — selo notarial + título de gala + data real + ações (PDF / Compartilhar).
 */
function ResultsHero({ onDownload, onShare, galaDate }) {
  return (
    <section className="flex flex-col items-center text-center gap-4 pt-4">
      {/* Selo notarial homologado (verde suave) */}
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-sans font-semibold text-label-sm uppercase tracking-widest shadow-[0_0_16px_rgba(52,211,153,0.12)]">
        <span className="material-symbols-outlined text-[18px]">verified</span>
        {RESULTS_COPY.seal}
      </span>

      {/* Título de gala */}
      <h1 className="font-serif font-bold text-display-lg-mobile lg:text-display-lg leading-none tracking-tight max-w-4xl">
        Galeria Oficial de{' '}
        <span className="gold-gradient-text">Resultados {RESULTS_COPY.edition}</span>
      </h1>

      {/* Data real da cerimônia (reveal_at) — neutra quando não agendada */}
      <p className="inline-flex items-center gap-2 font-sans text-body-md text-on-surface-variant">
        <span className="material-symbols-outlined text-secondary text-[18px]">event</span>
        Data da Gala: <span className="font-medium text-on-surface">{galaDate}</span>
      </p>

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
function GalleryStatCard({ icon, label, value, detail, live }) {
  return (
    <div className="bg-surface-container/90 backdrop-blur-md rounded-2xl p-5 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.6),0_0_20px_0_rgba(212,175,55,0.06)] relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="flex items-center gap-2 mb-3">
        <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">{label}</span>
        {live && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-sans font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ao vivo
          </span>
        )}
        <span className={`material-symbols-outlined text-primary text-[22px] ${live ? '' : 'ml-auto'}`}>{icon}</span>
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
function BehindTheScenes({ stats }) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {stats.map((s) => (
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
 *
 * Fontes de dados da página (ZERO números inventados):
 *   - GET /api/results → pódios, filtros e curiosidades derivadas;
 *   - GET /api/state   → data da gala (reveal_at) + fallback dos contadores;
 *   - stream SSE       → contadores ao vivo para usuários logados.
 * Apenas a copy editorial (selo/edição) e a curiosidade cenográfica são fixas.
 */
export default function ResultsPage() {
  // Estado global da gala (fonte de verdade do bloqueio, do reveal e fallback
  // dos contadores quando o visitante NÃO está logado).
  const {
    votacaoAberta,
    revealAt,
    loading: loadingGala,
    totalVotos: totalVotosState,
    totalUsers: totalUsersState,
  } = useGalaState()

  // Stream SSE (ADR-0003): conectado apenas para usuários logados. Quando ativo,
  // os contadores atualizam SEM reload; sem sessão, `totals` fica null e o
  // fallback do /api/state assume.
  const { totals, status: streamStatus } = useGalaEvents()

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

  // Análise numérica REAL por categoria (votos somados e margem 1º→2º).
  const categoryAnalytics = useMemo(() => analyzeResults(results), [results])

  // 4º destaque: categoria com o maior total de votos somados (nunca inventado).
  const mostVotedCategory = useMemo(() => {
    if (categoryAnalytics.length === 0) return null
    const best = categoryAnalytics.reduce(
      (acc, cat) => (cat.total > acc.total ? cat : acc),
      categoryAnalytics[0]
    )
    return best.total > 0 ? best : null
  }, [categoryAnalytics])

  // Contadores ao vivo (stream) com fallback do /api/state (sem sessão).
  const totalVotos = totals?.totalVotos ?? totalVotosState
  const totalUsers = totals?.totalUsers ?? totalUsersState
  const categoryCount = results ? results.length : null

  // Cards de destaque: TODOS os valores vêm do servidor (ou são derivados dele).
  const galleryStats = [
    {
      icon: 'how_to_vote',
      label: 'Votos Computados',
      value: formatCount(totalVotos),
      detail: 'apuração em sigilo notarial',
      live: streamStatus === 'conectado',
    },
    {
      icon: 'groups',
      label: 'Eleitores na Gala',
      value: formatCount(totalUsers),
      detail: 'chaves notariais ativas',
      live: streamStatus === 'conectado',
    },
    {
      icon: 'military_tech',
      label: 'Categorias Disputadas',
      value: formatCount(categoryCount),
      detail: 'categorias homologadas pelo cartório',
    },
    {
      icon: 'trending_up',
      label: 'Categoria Mais Votada',
      value: mostVotedCategory ? formatCount(mostVotedCategory.total) : '—',
      detail: mostVotedCategory ? mostVotedCategory.title : 'Aguardando apuração',
    },
  ]

  // Curiosidades: 100% derivadas de dados reais (sem cenográfico desde a
  // remoção do "Horário de Pico" — decisão do dono).
  const funStats = buildFunStats(categoryAnalytics, totalVotos, totalUsers)

  const galaDate = formatGalaDate(revealAt)

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
          title: `Galeria Oficial de Resultados ${RESULTS_COPY.edition}`,
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
            galaDate={galaDate}
          />

          {/* Métricas principais — todas reais (stream/estado/resultados) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {galleryStats.map((s) => (
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
            ) : resultCategories.length === 0 ? (
              <p className="text-center font-sans text-body-sm text-on-surface-variant">
                O cartório ainda não homologou nenhuma categoria para esta edição.
              </p>
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

          {/* Bastidores da votação — 3 curiosidades reais + 1 cenográfica assumida */}
          <BehindTheScenes stats={funStats} />

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