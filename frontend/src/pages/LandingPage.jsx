import { useNavigate } from 'react-router-dom'
import Trophy3D from '../components/Trophy3D'
import Countdown from '../components/Countdown'
import useAuth from '../hooks/useAuth'

/**
 * useVoteNav — helper que decide o destino do clique em qualquer botão "Votar".
 * Se autenticado → /votar; senão → /login.
 */
function useVoteNav() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  return () => navigate(isAuthenticated ? '/votar' : '/login')
}

// Mock categories data — replace with /api/categories when API is ready
const MOCK_CATEGORIES = [
  {
    id: 'participacao-especial',
    emoji: '🎭',
    title: 'Melhor Participação Especial',
    description: 'Dedicado àquele sujeito lendário que sumiu por 8 meses seguidos, não respondeu "bom dia", mas do nada dropou um áudio bombástico de 4 minutos no meio do expediente e evaporou de novo.',
    nominees: 5,
    favorite: '"O Fantasma do Zap"',
  },
  {
    id: 'mais-pataquadas',
    emoji: '🤡',
    title: 'Membro com Mais Pataquadas',
    description: 'O acervo vivo de gafes, prints censurados, mensagens mandadas no grupo errado, compras absurdas na Shopee e mancadas memoráveis que mantiveram o entretenimento do grupo no teto.',
    nominees: 6,
    favorite: 'Recorde: 48 prints incriminadores',
  },
  {
    id: 'mais-mitadas',
    emoji: '👑',
    title: 'Membro com Mais Mitadas',
    description: 'Respostas cirúrgicas na velocidade da luz, stickers milimetricamente calculados, jogadas inacreditáveis na call do Discord e tiradas que calaram a boca de todos instantaneamente.',
    nominees: 4,
    favorite: 'Critério: Destruição retórica',
  },
  {
    id: 'qi-temperatura-ambiente',
    emoji: '🌡️',
    title: 'QI de Temperatura Ambiente',
    description: 'Para raciocínios que desafiaram a ciência, hipóteses astronômicas sem pé nem cabeça, confusões geográficas imperdoáveis e teorias que deixaram todos na call em silêncio absoluto por 20 segundos.',
    nominees: 7,
    favorite: 'Média térmica: 22° Celsius',
  },
]

function CategoryCard({ category }) {
  const goVote = useVoteNav()
  return (
    <div className="group relative rounded-2xl bg-surface-container/70 backdrop-blur-xl p-8 flex flex-col justify-between shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(212,175,55,0.18)] transition-all duration-300 border border-transparent hover:border-primary/10">
      {/* Gold top accent line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-t-2xl" />

      <div>
        <div className="flex items-start justify-between mb-6">
          <span className="text-4xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]" aria-hidden="true">
            {category.emoji}
          </span>
          <span className="px-3 py-1 rounded-full bg-surface-container-high font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">
            {category.nominees} Indicados
          </span>
        </div>

        <h3 className="font-serif font-bold text-headline-sm text-on-surface mb-3 group-hover:text-primary transition-colors">
          {category.title}
        </h3>

        <p className="font-sans text-body-md text-on-surface-variant leading-relaxed">
          {category.description}
        </p>
      </div>

      {/* Card footer */}
      <div className="mt-8 flex items-center justify-between bg-surface-container-low/50 -mx-8 -mb-8 px-8 py-4 rounded-b-2xl">
        <span className="font-sans text-body-sm text-outline flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
          {category.favorite}
        </span>
        <button
          type="button"
          onClick={goVote}
          className="text-primary hover:text-primary-fixed font-sans font-semibold text-title-md inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"
        >
          Votar <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  )
}

function Header() {
  const goVote = useVoteNav()
  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.6),0_0_24px_0_rgba(212,175,55,0.08)]">
      <div className="h-20 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
        {/* Logo */}
        <div className="flex items-center gap-space-md">
          <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center shadow-[0_0_16px_rgba(212,175,55,0.25)]">
            <span className="material-symbols-outlined text-primary text-[24px]">trophy</span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-headline-sm text-primary tracking-wide leading-none">
              PRÊMIOS DO GRUPO 2025
            </span>
            <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest mt-1">
              A Gala Suprema da Zoeira
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-space-lg">
          {[
            { href: '#inicio', label: 'Início' },
            { href: '#categorias', label: 'Categorias' },
            { href: '#cerimonia', label: 'A Cerimônia' },
            { href: '#resultados', label: 'Resultados' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="font-sans text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {label}
            </a>
          ))}
          <button
            type="button"
            onClick={goVote}
            className="font-sans text-body-md text-on-surface-variant hover:text-primary transition-colors"
          >
            Votação
          </button>
        </nav>

        {/* CTA actions */}
        <div className="flex items-center gap-space-md">
          <button
            type="button"
            onClick={goVote}
            className="hidden sm:inline-flex items-center justify-center px-space-lg py-space-sm rounded-lg bg-primary hover:bg-primary-container text-on-primary font-sans font-semibold text-body-md transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:scale-[1.02]"
          >
            Votar Agora
          </button>
          <a
            href="/admin"
            title="Acesso Restrito da Academia"
            className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-primary flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
          </a>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.3)]">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function HeroSection() {
  return (
    <section id="inicio" className="relative w-full px-6 lg:px-12 pt-10 pb-16 flex flex-col items-center text-center">
      {/* Ambient glow blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-primary/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-[800px] -left-48 w-[600px] h-[600px] bg-tertiary-container/10 blur-[160px] pointer-events-none rounded-full" />

      {/* Prestige badge */}
      <div className="inline-flex items-center gap-space-sm px-space-lg py-1.5 rounded-full bg-surface-container-high/70 backdrop-blur-md shadow-[0_0_24px_rgba(212,175,55,0.25)] mb-8 transform hover:scale-105 transition-all duration-300">
        <span className="material-symbols-outlined text-primary text-[18px]">workspace_premium</span>
        <span className="font-sans font-bold text-label-sm uppercase tracking-[0.2em] text-primary">
          A MAIOR CERIMÔNIA DO DISCORD &amp; ZAP • EDIÇÃO ANUAL
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
      </div>

      {/* Main title */}
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="font-serif font-bold text-[clamp(36px,6vw,68px)] leading-[1.1] tracking-tight bg-gradient-to-r from-secondary-fixed via-primary to-primary-container bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(212,175,55,0.2)]">
          Consagrando as Maiores Lendas (e Vergonhas) do Ano
        </h1>
      </div>

      {/* Subtitle */}
      <p className="max-w-2xl mx-auto font-sans text-body-lg text-on-surface-variant leading-relaxed mb-10">
        Uma noite inesquecível de gala, trajes a rigor e humilhação entre amigos. Onde cada pataquada vira história lendária e cada mitada desafia as leis da estatística.
      </p>

      {/* 3D Trophy Vitrine */}
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center my-4">
        {/* Stage halo */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-transparent to-surface pointer-events-none rounded-3xl" />
        <div className="absolute inset-x-12 top-10 h-72 bg-gradient-to-b from-primary-container/20 to-transparent blur-3xl pointer-events-none" />

        {/* Spotlight cone (SVG) */}
        <div className="absolute top-0 w-[420px] h-[340px] opacity-25 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 400 300" fill="none">
            <defs>
              <linearGradient id="spotlight-g" x1="200" y1="0" x2="200" y2="300" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F2CA50" stopOpacity="0.8" />
                <stop offset="1" stopColor="#131318" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points="120,0 280,0 380,300 20,300" fill="url(#spotlight-g)" />
          </svg>
        </div>

        {/* Three.js trophy */}
        <div className="relative z-10 w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <Trophy3D />
        </div>

        {/* Pedestal plaque */}
        <div className="-mt-8 relative z-20 px-space-lg py-space-sm rounded-xl bg-surface-container-high/90 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.7),0_0_20px_rgba(212,175,55,0.18)] flex items-center gap-space-md max-w-xl">
          <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
          <div className="flex flex-col text-left">
            <span className="font-sans font-bold text-label-md uppercase tracking-wider text-primary">
              Troféu Oficial • Ouro Maciço 24k (Quase)
            </span>
            <span className="font-sans text-body-sm text-on-surface-variant">
              Busto Comemorativo do Davi Jones &amp; Mestre Supremo da Resenha
            </span>
          </div>
          <span className="hidden sm:inline-block ml-auto px-2 py-0.5 rounded bg-surface-container font-sans font-bold text-label-sm text-secondary tracking-widest uppercase">
            Edição 2025
          </span>
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  const goVote = useVoteNav()
  return (
    <section className="w-full px-6 lg:px-12 py-14 flex flex-col items-center text-center">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md w-full max-w-md mx-auto mb-6">
        {/* Primary CTA */}
        <button
          type="button"
          onClick={goVote}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-space-sm px-8 py-4 rounded-xl bg-gradient-to-r from-primary-fixed to-primary text-on-primary font-sans font-bold text-title-md tracking-wide transition-all duration-300 shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:shadow-[0_0_45px_rgba(212,175,55,0.7)] hover:scale-105 active:scale-95 group"
        >
          <span>VOTAR AGORA NOS SEUS AMIGOS</span>
          <span className="material-symbols-outlined group-hover:translate-x-1.5 transition-transform text-[20px]">arrow_forward</span>
        </button>

        {/* Ghost CTA */}
        <a
          href="#categorias"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-6 py-4 rounded-xl bg-surface-container-high/80 hover:bg-surface-container-highest text-on-surface font-sans font-semibold text-title-md transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">view_agenda</span>
          <span>Ver Categorias &amp; Indicados</span>
        </a>
      </div>

      {/* Vote stats (mock) */}
      <div className="inline-flex items-center gap-space-sm px-space-lg py-2 rounded-full bg-surface-container/70 backdrop-blur-md shadow-md text-on-surface-variant font-sans text-body-sm">
        <span className="material-symbols-outlined text-primary text-[18px]">how_to_vote</span>
        <span><strong>1.428</strong> votos já computados em sigilo absoluto</span>
        <span className="w-1 h-1 rounded-full bg-outline" />
        <span className="text-secondary">42 membros da Academia já votaram</span>
      </div>
    </section>
  )
}

function CategoriesSection() {
  return (
    <section id="categorias" className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-16">
      {/* Section header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-[18px]">hotel_class</span>
            <span className="font-sans font-bold text-label-sm uppercase tracking-widest text-primary">CATEGORIAS DE ALTO CALIBRE</span>
          </div>
          <h2 className="font-serif font-bold text-headline-lg text-on-surface">
            As Estatuetas Mais Cobiçadas da Noite
          </h2>
        </div>
        <p className="font-sans text-body-md text-on-surface-variant max-w-md">
          Quatro das doze categorias oficiais abertas para votação popular. O voto é secreto, mas o bullying subsequente é 100% público.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        {MOCK_CATEGORIES.map(cat => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </section>
  )
}

function CeremonySection() {
  const goVote = useVoteNav()
  return (
    <section id="cerimonia" className="w-full px-6 lg:px-12 py-16 bg-surface-container-lowest relative">
      <div className="max-w-7xl mx-auto rounded-3xl bg-surface-container/90 backdrop-blur-2xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative overflow-hidden">
        {/* Gold top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left column */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="inline-flex items-center gap-space-xs px-3 py-1 rounded-full bg-surface-container-high w-fit">
              <span className="material-symbols-outlined text-primary text-[18px]">podium</span>
              <span className="font-sans font-bold text-label-sm uppercase tracking-widest text-primary">
                TRANSMISSÃO PRIVADA • /reveal
              </span>
            </div>

            <h2 className="font-serif font-bold text-headline-lg text-on-surface">
              Como Funcionará a Noite de Gala ao Vivo?
            </h2>

            <p className="font-sans text-body-lg text-on-surface-variant leading-relaxed">
              Nada de enquete mixuruca no feed. No dia marcado, a rota{' '}
              <code className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-mono text-sm font-semibold">
                /reveal
              </code>{' '}
              se transformará numa arena de premiação cinematográfica sincronizada por WebSockets.
            </p>

            {/* 3 step highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md mt-4">
              {[
                { icon: 'graphic_eq', title: 'Drumroll Tenso', desc: 'Áudios dramáticos de suspense e contagem de votos voto-a-voto na tela de todos.' },
                { icon: 'celebration', title: 'Chuva de Confetes', desc: 'Disparo de partículas e badges dourados no momento exato em que o campeão for anunciado.' },
                { icon: 'military_tech', title: 'Pódio Interativo', desc: 'Pedestais de 1º, 2º e 3º lugar com o print da mitada e direito a discurso no canal de voz.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="p-4 rounded-xl bg-surface-container-high/60">
                  <span className="material-symbols-outlined text-primary text-[28px] mb-2">{icon}</span>
                  <h4 className="font-sans font-semibold text-title-md text-on-surface mb-1">{title}</h4>
                  <p className="font-sans text-body-sm text-on-surface-variant">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right callout card */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-8 rounded-2xl bg-surface-container-highest/60 text-center shadow-inner">
            <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <span className="material-symbols-outlined text-primary text-[32px]">campaign</span>
            </div>
            <span className="font-serif font-bold text-headline-sm text-on-surface mb-2">
              Garanta seu Voto
            </span>
            <p className="font-sans text-body-sm text-on-surface-variant mb-6">
              A ata da Academia só aceita votos até o sino das 21:00h. Não deixe o amigo inimputável vencer sem oposição!
            </p>
            <button
              type="button"
              onClick={goVote}
              className="w-full inline-flex items-center justify-center gap-space-xs px-6 py-3.5 rounded-xl bg-primary text-on-primary font-sans font-bold text-title-md shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:scale-105 transition-all"
            >
              <span>Abrir Cédula Oficial</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest py-space-xl shadow-[0_-1px_12px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-space-lg">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-space-xs text-primary font-serif font-bold text-headline-sm">
            <span className="material-symbols-outlined text-[20px]">stars</span>
            <span>Academia das Artes e Zoações do Grupo</span>
          </div>
          <p className="font-sans text-body-sm text-on-surface-variant mt-1 max-w-md">
            Celebrando a mediocridade épica, áudios intermináveis de WhatsApp e prints fora de contexto com a máxima pompa e circunstância.
          </p>
        </div>

        {/* Server status (mock) */}
        <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-full">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-sans font-bold text-label-sm text-secondary">Servidor da Gala: 100% Calmo &amp; Alinhado</span>
        </div>

        {/* Legal */}
        <div className="font-sans text-body-sm text-outline text-center md:text-right">
          <p>© 2025 Prêmios do Grupo.</p>
          <p className="font-sans font-bold text-label-sm text-outline mt-0.5">
            Nenhum admin foi ferido durante a contagem de votos.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header />
      <main className="w-full pt-20 bg-surface flex-grow flex flex-col">
        <div className="flex flex-col w-full relative overflow-hidden">
          <HeroSection />
          <Countdown />
          <CTASection />
          <CategoriesSection />
          <CeremonySection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
