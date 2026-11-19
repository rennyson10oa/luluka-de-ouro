import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { Footer } from '../components/Footer'
import RevealCard from '../components/reveal/RevealCard'
import RevealChat from '../components/reveal/RevealChat'
import ConfettiCanvas from '../components/reveal/ConfettiCanvas'
import useGalaState from '../hooks/useGalaState'
import useGalaEvents from '../hooks/useGalaEvents'
import useAuth from '../hooks/useAuth'
import useAdminAuth from '../hooks/useAdminAuth'
import { apiFetch } from '../utils/api'
import {
  isSoundEnabled,
  toggleSound,
  startDrumroll,
  stopDrumroll,
  playRevealHit,
} from '../utils/galaAudio'

/** Formato "04d 18h 41m 20s" para a contagem da cerimônia. */
function formatCountdown(diff) {
  const pad = (n) => String(n).padStart(2, '0')
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

/**
 * Mapeia um resultado REAL (GET /api/results: {category_id,title,podium[]})
 * para o shape cosmético que o RevealCard consome (memeName, pct, áudio
 * decorativo, reações...). O que o servidor não expõe é preenchido com
 * fallback seguro — o card nunca quebra com pódio incompleto.
 */
function mapRealResult(real) {
  const p = Array.isArray(real.podium) ? real.podium : []
  const total = p.reduce((s, x) => s + (x.votes || 0), 0) || 1
  const pctOf = (x) => `${Math.round(((x.votes || 0) / total) * 100)}% dos Votos Populares`
  const mk = (x) =>
    x
      ? {
          memeName: x.username,
          realName: x.pitch || 'Sem pitch registrado',
          votes: `${x.votes} Votos`,
          pct: pctOf(x),
          icon: 'sentiment_very_satisfied',
          reactions: 'reações em ata',
          detail: x.pitch || '',
        }
      : {
          memeName: 'A definir',
          realName: '—',
          votes: '0 Votos',
          pct: '0%',
          icon: 'hourglass_empty',
          reactions: '—',
          detail: 'pódio em apuração',
        }
  return {
    id: real.category_id,
    title: real.title,
    emoji: '🏆',
    quote: 'Resultado oficial apurado pelo cartório da gala.',
    podium: {
      first: mk(p[0]),
      second: mk(p[1]),
      third: mk(p[2]),
      honorable: mk(p[3]),
    },
  }
}

/**
 * ConsolePalco — gaveta lateral do mestre de cerimônias (dentro do /reveal).
 *
 * Modelo de palco simplificado (decisão do dono): cada categoria tem DOIS
 * estágios (chamada → revelada INTEIRA). O card visual mostra o pódio
 * completo num único reveal — os antigos botões 3º/2º/1º revelavam tudo
 * ao mesmo tempo e eram controle sem efeito visual. A gaveta lista TODAS
 * as categorias com status e navega sequencialmente.
 *
 * Fonte de posição: com o admin logado como usuário, o stream alimenta
 * tudo sozinho; só com sessão soberana, as respostas REST dos comandos.
 */
function ConsolePalco({ onClose }) {
  const { admin } = useAdminAuth()
  const { ceremony, status: streamStatus, onEvent } = useGalaEvents()
  const [localPosition, setLocalPosition] = useState(null)
  const [categories, setCategories] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Posição inicial local + lista de categorias (ORDENADAS por reveal_order).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [pos, cats] = await Promise.all([
        apiFetch('/api/ceremony/position'),
        apiFetch('/api/categories'),
      ])
      if (cancelled) return
      if (pos.ok && pos.data) setLocalPosition(pos.data)
      if (cats.ok && Array.isArray(cats.data)) setCategories(cats.data)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Eventos do stream também alimentam o console (admin com conta de usuário).
  useEffect(() => {
    return onEvent((evt) => {
      if (evt.type === 'ceremony.step') setLocalPosition(evt.payload)
    })
  }, [onEvent])

  // Posição efetiva: stream manda quando conectado; comandos, quando não.
  const pos = streamStatus === 'conectado' ? { ...(localPosition || {}), ...ceremony } : localPosition || ceremony
  const phase = pos?.phase ?? null
  const fechadas = new Set(pos?.revealed || [])
  const emPalco = pos?.category_id ?? null

  async function command(path) {
    setBusy(true)
    setError('')
    const res = await apiFetch(`/api/admin/ceremony/${path}`, { method: 'POST', token: admin?.token })
    setBusy(false)
    if (res.ok && res.data) {
      setLocalPosition(res.data)
    } else {
      setError(typeof res.data?.detail === 'string' ? res.data.detail : 'Falha no comando do palco')
    }
  }

  const btnBase =
    'w-full px-3 py-2.5 rounded-xl font-sans font-semibold text-body-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-1.5'

  const phaseLabels = {
    abertura: 'Abertura — aguardando chamada',
    categoria: 'Categoria em palco',
    revelacao: 'Categoria revelada',
    encerramento: 'Cerimônia encerrada',
  }

  return (
    <aside className="fixed left-0 top-20 bottom-0 z-50 w-[300px] bg-surface-container-lowest/95 backdrop-blur-xl border-r border-primary/30 shadow-[8px_0_32px_rgba(0,0,0,0.5)] flex flex-col">
      {/* Cabeçalho da gaveta */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary text-[20px]">theater_comedy</span>
          <span className="font-serif font-bold text-title-md text-on-surface truncate">Console do Palco</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Fechar console"
          className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Fase atual */}
      <div className="px-4 py-3 border-b border-outline-variant/30 shrink-0">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-sans font-bold uppercase tracking-widest ${
            phase
              ? 'bg-error-container/20 border border-error/40 text-error'
              : 'bg-surface-container-high text-outline'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${phase ? 'bg-error animate-pulse' : 'bg-surface-container-highest'}`} />
          {phase ? phaseLabels[phase] || phase : 'Não iniciada'}
        </span>
      </div>

      {/* Lista de categorias com status (fonte: GET /api/categories) */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5 min-h-0">
        <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-wider mb-1">
          Ordem da cerimônia
        </span>
        {categories.map((cat, i) => {
          const fechada = fechadas.has(cat.id)
          const noPalco = emPalco === cat.id
          return (
            <div
              key={cat.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors ${
                noPalco
                  ? 'bg-primary/10 border-primary/40'
                  : fechada
                    ? 'bg-surface-container/60 border-transparent opacity-60'
                    : 'bg-surface-container-low/60 border-transparent'
              }`}
            >
              <span className="font-sans text-[11px] text-outline w-5 text-right">{i + 1}º</span>
              <span className="text-lg" aria-hidden="true">{cat.emoji}</span>
              <span className="flex-1 min-w-0 font-sans text-body-sm text-on-surface truncate">{cat.title}</span>
              {fechada ? (
                <span className="material-symbols-outlined text-[16px] text-emerald-400" title="Encerrada">check_circle</span>
              ) : noPalco ? (
                <span className="w-2 h-2 rounded-full bg-error animate-pulse shrink-0" title="Em palco" />
              ) : (
                <span className="material-symbols-outlined text-[16px] text-outline" title="Pendente">schedule</span>
              )}
            </div>
          )
        })}

        {error && <p className="font-sans text-[11px] text-error mt-1">{error}</p>}

        <p className="font-sans text-[11px] text-outline leading-tight mt-auto pt-2">
          Cada comando é difundido a todos os convidados em tempo real
          <code className="text-secondary"> (ADR-0003)</code>.
        </p>
      </div>

      {/* Ações do palco (sequenciais — nada de pular) */}
      <div className="p-4 border-t border-outline-variant/30 shrink-0 flex flex-col gap-2">
        {phase === null && (
          <button type="button" disabled={busy} onClick={() => command('start')}
            className={`${btnBase} bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary shadow-[0_0_16px_rgba(212,175,55,0.35)] hover:brightness-110`}>
            <span className="material-symbols-outlined text-[18px]">play_circle</span>
            Iniciar Cerimônia
          </button>
        )}

        {phase === 'abertura' && (
          <button type="button" disabled={busy} onClick={() => command('next')}
            className={`${btnBase} bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/50`}>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            Chamar Próxima Categoria
          </button>
        )}

        {phase === 'categoria' && (
          <button type="button" disabled={busy} onClick={() => command('reveal')}
            className={`${btnBase} bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary shadow-[0_0_16px_rgba(212,175,55,0.35)] hover:brightness-110`}>
            <span className="material-symbols-outlined text-[18px]">emoji_events</span>
            Revelar Categoria
          </button>
        )}

        {phase === 'revelacao' && (
          <button type="button" disabled={busy} onClick={() => command('next')}
            className={`${btnBase} bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/50`}>
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
            Fechar Categoria
          </button>
        )}

        {phase && phase !== 'encerramento' && (
          <button type="button" disabled={busy} onClick={() => command('prev')}
            className={`${btnBase} bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/40`}>
            <span className="material-symbols-outlined text-[18px]">undo</span>
            Voltar uma etapa
          </button>
        )}

        {phase === 'encerramento' && (
          <p className="font-sans text-body-sm text-outline italic text-center">
            Gala encerrada — "Voltar uma etapa" reabre a última categoria se precisar.
          </p>
        )}

        {/* Reset do palco: volta a "não iniciada" — passe geral quantas vezes quiser.
            NÃO apaga votos: é só posição de palco (decisão registrada no backend). */}
        {phase && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Reiniciar a cerimônia do zero? O palco volta a "não iniciada" (os votos da gala NÃO são apagados).')) {
                command('reset')
              }
            }}
            className={`${btnBase} bg-surface-container/60 text-error/90 border border-error/30 hover:bg-error-container/20 hover:text-error`}
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Reiniciar cerimônia
          </button>
        )}
      </div>
    </aside>
  )
}

/**
 * CERIMÔNIA DIRIGIDA (ADR-0003): o servidor comanda, todos acompanham.
 *
 * Dados: GET /api/results (só fica acessível depois que reveal_at passou —
 * e a cerimônia só inicia depois disso). Posição: ceremony do useGalaEvents,
 * alimentada pelo stream (ceremony.step) + resync de /api/ceremony/position.
 */
function CerimoniaDirigida({ confettiRef }) {
  const { ceremony, status: streamStatus } = useGalaEvents()
  const { user } = useAuth()
  const [results, setResults] = useState(null)
  const [banner, setBanner] = useState(null)
  const bannerTimer = useRef(null)

  // Pódios reais: uma única busca no mount (cerimônia ativa ⇒ reveal_at passou).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await apiFetch('/api/results')
      if (cancelled) return
      setResults(res.ok && Array.isArray(res.data) ? res.data.map(mapRealResult) : [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Efeitos dirigidos pela TRANSIÇÃO DE FASE do palco (funciona via stream
  // E via resync): entrou em 'revelacao' → confete + banner; 'encerramento'
  // → chuva de finale. O card é revelado INTEIRO — não há drum roll por ordem.
  const prevPhaseRef = useRef(null)
  useEffect(() => {
    const phase = ceremony.phase
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase
    if (prev === null || prev === phase) return // sem spam no mount/resync
    if (phase === 'revelacao') {
      setBanner('🏆 Categoria revelada!')
      confettiRef.current?.fire(180)
      if (bannerTimer.current) clearTimeout(bannerTimer.current)
      bannerTimer.current = setTimeout(() => setBanner(null), 4000)
    }
    if (phase === 'encerramento') {
      confettiRef.current?.fire(200)
      const t = setTimeout(() => confettiRef.current?.fire(160), 900)
      bannerTimer.current = t // reutiliza o ref para o cleanup
    }
  }, [ceremony.phase, confettiRef])

  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current) }, [])

  if (results === null) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <span className="font-sans text-body-md text-on-surface-variant animate-pulse">
          Sincronizando com o cartório...
        </span>
      </div>
    )
  }

  // Índice da categoria em pauta (a ordem da lista já segue reveal_order).
  const idx = results.findIndex((r) => r.id === ceremony.category_id)
  const category = idx >= 0 ? results[idx] : null
  // Revelação INTEIRA: o card abre quando a fase vira 'revelacao' — também
  // correto após resync de página (a posição pública carrega a fase).
  const revealed = ceremony.phase === 'revelacao'
  const isEncerramento = ceremony.phase === 'encerramento'

  // Dots: concluída = reveal_order da categoria já fechado (ceremony.revealed).
  const doneOrders = new Set(ceremony.revealed)

  return (
    <>
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-24">
        {/* Progresso da cerimônia dirigida */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8">
          <span className="font-sans font-bold text-label-md text-secondary uppercase tracking-widest">
            {doneOrders.size} de {results.length} categorias encerradas
          </span>
          <div className="flex items-center gap-2">
            {results.map((cat) => {
              // ceremony.revealed guarda IDs de CATEGORIA fechadas (padrão do backend).
              const done = doneOrders.has(cat.id)
              const current = cat.id === ceremony.category_id
              return (
                <span
                  key={cat.id}
                  title={cat.title}
                  className={`w-8 h-2 rounded-full transition-all duration-300 ${
                    done ? 'bg-emerald-500' : current ? 'bg-primary animate-pulse' : 'bg-surface-container-high'
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Banner do último evento dirigido */}
        {banner && (
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary font-sans font-bold text-title-md shadow-[0_0_30px_rgba(212,175,55,0.5)] animate-pulse">
              {banner}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            {isEncerramento ? (
              <div className="text-center bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-8 border border-primary/30">
                <h2 className="font-serif font-bold text-headline-lg text-primary mb-3">
                  Fim da Cerimônia! 🏆
                </h2>
                <p className="font-sans text-body-md text-on-surface-variant mb-6">
                  Todas as vergonhas foram reveladas em ata.
                </p>
                <Link
                  to="/resultados"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-title-md shadow-[0_0_24px_rgba(212,175,55,0.4)] hover:brightness-110 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">photo_library</span>
                  Ver Galeria de Resultados
                </Link>
              </div>
            ) : ceremony.phase === 'abertura' || !category ? (
              <div className="relative bg-surface-container-low/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_45px_rgba(212,175,55,0.15)] text-center">
                <span className="text-6xl" aria-hidden="true">🎬</span>
                <h1 className="font-serif font-bold text-headline-lg text-on-surface tracking-tight mt-4">
                  A Gala Começou!
                </h1>
                <p className="font-sans text-body-md text-on-surface-variant italic mt-2">
                  O mestre de cerimônias está chamando a primeira categoria. Fique de olho no chat.
                </p>
              </div>
            ) : (
              <RevealCard key={`${category.id}-${revealed}`} category={category} revealed={revealed} onReveal={null} />
            )}
          </div>

          {/* Chat real (stream) — sempre ativo na cerimônia dirigida */}
          <aside className="lg:col-span-4">
            <RevealChat active currentUser={user} />
          </aside>
        </div>

        {/* Status da conexão (o batimento vem do servidor, não daqui) */}
        <p className="mt-8 text-center font-sans text-body-sm text-outline">
          {streamStatus === 'conectado' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse mr-1.5" />
              Sincronizado com o palco em tempo real
            </>
          ) : (
            'Reconectando ao palco...'
          )}
        </p>
      </main>
    </>
  )
}

export default function RevealPage() {
  // Fonte de verdade do relógio: GET /api/state (substitui pg_reveal_at).
  const { revealAt } = useGalaState()
  // Stream da gala: quando phase !== null, a cerimônia é DIRIGIDA pelo admin.
  const { ceremony, refresh: resyncGala } = useGalaEvents()
  const { admin } = useAdminAuth()
  const { user } = useAuth()
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  // Ref do confete: compartilhado entre a cerimônia dirigida e a pré-gala.
  const confettiRef = useRef(null)

  // MÁQUINA DE ESTADOS do /reveal — precedência NESTA ordem:
  //   1. DIRIGIDA — o servidor tem fase ativa (phase !== null);
  //   2. TRANCADA — sem fase e reveal_at ainda no futuro;
  //   3. PRÉ-CERIMÔNIA — sem fase e reveal_at nulo/passado (tela neutra).
  // (O antigo estado de ENSAIO — máquina local com 4 categorias mockadas —
  //  foi removido: o palco só existe de verdade, dirigido pelo admin.)
  const dirigida = ceremony.phase !== null
  const isLocked = !dirigida && Boolean(revealAt && revealAt.getTime() > now)

  // ---- Som da gala (drumroll + tada) ----
  // Preferência persistida; o AudioContext só desperta num gesto do usuário
  // (política de autoplay), por isso o toggle é opt-in.
  const [somAtivo, setSomAtivo] = useState(isSoundEnabled())

  // Orquestração: drumroll SOMENTE com a categoria em suspense no palco
  // (fase 'categoria') — na abertura ("A gala começou") ainda não há o que
  // revelar, e a plateia não merece cacla sem anúncio. Prato no instante
  // em que a fase vira 'revelacao'. Fora da dirigida, silêncio total.
  const suspenseRef = useRef(false)
  useEffect(() => {
    const emSuspense = dirigida && ceremony.phase === 'categoria'

    if (somAtivo && emSuspense) startDrumroll()
    else stopDrumroll()

    // Transição suspense → revelação: o TADAM (mesmo padrão do confete).
    if (suspenseRef.current && !emSuspense && ceremony.phase === 'revelacao' && somAtivo) {
      playRevealHit()
    }
    suspenseRef.current = emSuspense
  }, [dirigida, ceremony.phase, somAtivo])

  // Saindo da página: a cacla não pode continuar rolando sem plateia.
  useEffect(() => () => stopDrumroll(), [])

  // Resync ativo no mount: se a cerimônia JÁ está em andamento no servidor,
  // a página abre direto no modo dirigido — sem esperar o próximo evento do
  // stream (fix: quem entrava pela 1ª vez via o modo local antigo).
  useEffect(() => {
    resyncGala()
  }, [resyncGala])

  const countdown = formatCountdown(Math.max(0, (revealAt?.getTime() ?? now) - now))

  // Contagem regressiva: tica por segundo enquanto há reveal agendado.
  useEffect(() => {
    if (!revealAt) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [revealAt])

  // ---------------------- ESTADO 1: CERIMÔNIA DIRIGIDA ----------------------
  // O conteúdo de cada ramo vira uma variável; um wrapper único no fim da
  // página garante o Console do Palco disponível em TODOS os estados.
  let content = null

  if (dirigida) {
    content = (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <ConfettiCanvas ref={confettiRef} />
        <Header />
        {/* Barra de status da cerimônia dirigida */}
        <div className="sticky top-20 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-error-container/20 border border-error/40 text-error font-sans font-bold text-label-sm uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
              CERIMÔNIA DIRIGIDA — ACOMPANHANDO O PALCO
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high/80 text-outline font-sans font-bold text-label-sm uppercase tracking-widest">
              <span className="material-symbols-outlined text-[14px]">theater_comedy</span>
              Mestre de cerimônias: Admin
            </span>
            {/* Som opt-in (política de autoplay exige gesto): drumroll no
                suspense e tada no reveal, tudo sintetizado (galaAudio.js). */}
            <button
              type="button"
              onClick={() => setSomAtivo(toggleSound())}
              title={somAtivo ? 'Desativar o som da gala' : 'Ativar o som da gala (drumroll no suspense, tada na revelação)'}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-sans font-bold text-label-sm uppercase tracking-widest transition-all ${
                somAtivo
                  ? 'bg-primary text-on-primary border-primary shadow-[0_0_14px_rgba(212,175,55,0.4)]'
                  : 'bg-surface-container-high/80 text-outline border-outline-variant/50 hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {somAtivo ? 'volume_up' : 'volume_off'}
              </span>
              Som
            </button>
          </div>
        </div>
        <CerimoniaDirigida confettiRef={confettiRef} />
        <Footer />
      </div>
    )
  // ---------------------- ESTADO 2: TRANCADA ----------------------
  } else if (isLocked) {
    content = (
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
            <div className="flex items-center justify-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans font-semibold text-title-md transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Voltar ao Início
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )

  // ---------------------- ESTADO 3: PRÉ-CERIMÔNIA ----------------------
  // phase nula + reveal_at nulo/passado: tela neutra de espera ("A Gala Está
  // Reunida") com o chat já liberado para a conversa de espera.
  } else {
    content = (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <ConfettiCanvas ref={confettiRef} />
        <Header />

        {/* main em flex-col + my-auto no grid: o bloco card+chat fica
            CENTRALIZADO no espaço sob o header (o `items-start` antigo +
            pt-8 deixava tudo espremido no topo com um vazio embaixo).
            my-auto colapsa para 0 em telas baixas — sem cortar conteúdo. */}
        <main className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-24 flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto">
            <div className="lg:col-span-8">
              <div className="relative bg-surface-container-low/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_45px_rgba(212,175,55,0.15)] text-center">
                <span className="material-symbols-outlined text-primary text-[64px]" aria-hidden="true">
                  theater_comedy
                </span>
                <h1 className="font-serif font-bold text-headline-lg text-primary tracking-tight mt-4">
                  A Gala Está Reunida
                </h1>
                <p className="font-sans text-body-md text-on-surface-variant italic mt-3 max-w-xl mx-auto">
                  Os votos estão lacrados no cartório. O mestre de cerimônias abrirá a gala em instantes — fique de olho nesta tela e no chat.
                </p>
              </div>
            </div>

            {/* Pré-gala: o chat já está liberado para a conversa de espera.
                mt empurra o chat para baixo (o card tem menos altura que os
                480px do chat — sem isso o chat encosta na borda superior). */}
            <aside className="lg:col-span-4 lg:mt-12">
              <RevealChat active currentUser={user} />
            </aside>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  // Wrapper ÚNICO: conteúdo do estado atual + Console do Palco em TODOS os
  // estados. Assim o admin nunca perde o acesso ao palco após "Reiniciar".
  return (
    <>
      {content}

      {admin && !consoleOpen && (
        <button
          type="button"
          onClick={() => setConsoleOpen(true)}
          title="Abrir Console do Palco"
          className="fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-body-md shadow-[0_0_24px_rgba(212,175,55,0.45)] hover:brightness-110 hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">theater_comedy</span>
          Console do Palco
        </button>
      )}
      {admin && consoleOpen && <ConsolePalco onClose={() => setConsoleOpen(false)} />}
    </>
  )
}
