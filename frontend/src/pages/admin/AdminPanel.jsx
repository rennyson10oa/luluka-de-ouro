import { useState } from 'react'
import { HeaderAdmin } from '../../components/Header'
import useAdminAuth from '../../hooks/useAdminAuth'
import { MOCK_STATS, MOCK_CATEGORIES, MOCK_AUDIT_LOG, TOTAL_VOTES } from '../../data/mockAdmin'

const REVEAL_KEY = 'pg_reveal_at'

/**
 * AdminPanel — Painel de Controle Soberano da Academia.
 * MVP funcional: agendamento do reveal persiste em localStorage (lido pelo
 * Countdown da landing) e "Zerar Tudo" limpa as chaves pg_*. Gestão de
 * categorias/indicados é mock visual até o backend entrar.
 * Conteúdo puro: o shell (header global, footer) pertence a AdminPage.
 */

function StatCard({ icon, label, value, detail }) {
  return (
    <div className="bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="flex items-center gap-2 mb-3">
        <span className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        </span>
        <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">{label}</span>
      </div>
      <p className="font-serif font-bold text-[28px] leading-8 text-on-surface">{value}</p>
      <p className="font-sans text-body-sm text-outline mt-1">{detail}</p>
    </div>
  )
}

function NomineeRow({ nominee, maxVotes }) {
  const pct = Math.round((nominee.votes / maxVotes) * 100)
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-sans font-semibold text-body-md text-on-surface">
            {nominee.name} <span className="text-outline font-normal">({nominee.handle})</span>
          </p>
          <p className="font-sans text-body-sm text-on-surface-variant leading-relaxed mt-0.5">{nominee.pitch}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-sans font-bold text-body-md text-primary">{nominee.votes.toLocaleString('pt-BR')}</p>
          <p className="font-sans text-label-sm text-outline">votos ({pct}%)</p>
        </div>
      </div>
      {/* Barra de votos */}
      <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-fixed to-primary-container transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function CategoryCard({ category, onAction }) {
  const [open, setOpen] = useState(false)
  const maxVotes = Math.max(...category.nominees.map((n) => n.votes), 1)

  return (
    <div className="bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-3xl" aria-hidden="true">{category.emoji}</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif font-bold text-title-lg text-on-surface">{category.title}</h3>
              <span className="px-2 py-0.5 rounded bg-primary-container/15 border border-primary-container/30 text-primary-fixed text-[10px] font-mono uppercase tracking-wider">
                {category.reveal}
              </span>
            </div>
            <p className="font-sans text-body-sm text-on-surface-variant mt-1">{category.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/50 text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">{open ? 'expand_less' : 'expand_more'}</span>
          {open ? 'Recolher' : 'Indicados'}
        </button>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-wider">
              Indicados Oficiais Homologados ({category.nominees.length} concorrentes)
            </span>
            <button
              type="button"
              onClick={() => onAction('Edição de indicados chega com o backend (/api/admin/nominees).')}
              title="Adicionar indicado"
              className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
            </button>
          </div>
          {category.nominees.map((n) => (
            <NomineeRow key={n.id} nominee={n} maxVotes={maxVotes} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminPanel() {
  const { admin, logoutAdmin } = useAdminAuth()
  const [revealAt, setRevealAt] = useState(() => localStorage.getItem(REVEAL_KEY) || '')
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  function saveReveal(e) {
    e.preventDefault()
    if (!revealAt) return
    localStorage.setItem(REVEAL_KEY, new Date(revealAt).toISOString())
    showToast('Agendamento notarial registrado com sucesso!')
  }

  function wipeAll() {
    const confirmed = window.confirm(
      'Isso apagará TODOS os dados locais da gala (usuários, sessão admin, agendamento). Ação irreversível! Continuar?'
    )
    if (!confirmed) return
    Object.keys(localStorage)
      .filter((k) => k.startsWith('pg_'))
      .forEach((k) => localStorage.removeItem(k))
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('pg_'))
      .forEach((k) => sessionStorage.removeItem(k))
    showToast('Operação notarial realizada: todos os registros foram zerados.')
  }

  const filteredLog = MOCK_AUDIT_LOG.filter(
    (entry) =>
      !filter ||
      entry.user.toLowerCase().includes(filter.toLowerCase()) ||
      entry.votedIn.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex-grow w-full relative z-10">
      {/* HeaderAdmin — Console Soberano (variante da biblioteca) */}
      <div className="pt-20 bg-surface-container-lowest/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-3">
          <HeaderAdmin onLogout={() => { logoutAdmin(); showToast('Sessão soberana encerrada.') }} />
        </div>
      </div>

      <main className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-12 pb-24 w-full relative z-10">
        {/* ---- Status hero ---- */}
        <section className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                Autenticado: {admin?.username} ({admin?.role})
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/50 text-outline text-xs font-mono">
                <span className="material-symbols-outlined text-sm">dns</span>
                FastAPI + SQLite
              </span>
            </div>
            <h1 className="font-serif font-bold text-headline-lg text-on-surface tracking-tight">
              Painel de Controle <span className="gold-gradient-text">Soberano</span> da Academia
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-[11px] text-on-surface-variant mt-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Servidor da Gala: <strong className="text-emerald-400">100% Calmo &amp; Alinhado</strong></span>
              <span className="text-outline">•</span>
              <span className="material-symbols-outlined text-primary text-[14px]">lock_open</span>
              <span className="text-primary">ABERTA COM URNAS AQUECIDAS</span>
            </div>
          </div>

          {/* Agendamento do reveal — FUNCIONAL (persiste em pg_reveal_at) */}
          <form onSubmit={saveReveal} className="bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">calendar_clock</span>
              <span className="font-sans font-bold text-label-md text-secondary uppercase tracking-wider">Reveal Automático</span>
            </div>
            <input
              type="datetime-local"
              value={revealAt}
              onChange={(e) => setRevealAt(e.target.value)}
              className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface px-4 py-2.5 font-sans text-body-md text-[color-scheme:dark] focus:outline-none focus:bg-surface-container-low shadow-inner border border-outline-variant/40 focus:border-primary/50 transition-all"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-semibold text-body-md shadow-[0_0_16px_rgba(212,175,55,0.35)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              Salvar Agendamento
            </button>
            <p className="font-sans text-[11px] text-outline leading-tight">
              A contagem regressiva da landing lê este horário (chave <code className="text-secondary">pg_reveal_at</code>).
            </p>
          </form>
        </section>

        {/* ---- Stats ---- */}
        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {MOCK_STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </section>

        {/* ---- Corpo: categorias + audit log ---- */}
        <div className="mt-10 grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Categorias */}
          <section className="xl:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif font-bold text-headline-sm text-on-surface">Categorias Oficiais da Premiação</h2>
                <p className="font-sans text-body-sm text-on-surface-variant mt-0.5">
                  Estrutura cenográfica da gala e escalação de concorrentes
                </p>
              </div>
              <button
                type="button"
                onClick={() => showToast('Instituir nova categoria chega com o backend (/api/admin/categories).')}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-semibold text-body-md shadow-[0_0_16px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Nova
              </button>
            </div>
            {MOCK_CATEGORIES.map((cat) => (
              <CategoryCard key={cat.id} category={cat} onAction={showToast} />
            ))}
          </section>

          {/* Coluna lateral: audit log + danger zone */}
          <aside className="xl:col-span-5 flex flex-col gap-6">
            {/* Audit log */}
            <section className="bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">fingerprint</span>
                  <h2 className="font-serif font-bold text-title-lg text-on-surface">Urna Secreta &amp; Audit Log</h2>
                </div>
                <span className="font-sans text-[10px] text-outline font-mono">ATA NOTARIAL</span>
              </div>

              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrar por eleitor ou categoria..."
                className="w-full rounded-lg bg-surface-container-lowest/90 text-on-surface px-3.5 py-2 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner border border-outline-variant/40 focus:border-primary/50 transition-all mb-3"
              />

              <ul className="flex flex-col gap-2">
                {filteredLog.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/30">
                    <div className="min-w-0">
                      <p className="font-sans font-semibold text-body-sm text-on-surface truncate">
                        {entry.user} <span className="text-outline font-mono text-[10px]">{entry.session}</span>
                      </p>
                      <p className="font-sans text-[11px] text-on-surface-variant truncate">
                        Votou em: <span className="text-secondary">{entry.votedIn}</span>
                      </p>
                    </div>
                    <span className="shrink-0 font-sans text-[10px] text-outline">{entry.time}</span>
                  </li>
                ))}
                {filteredLog.length === 0 && (
                  <li className="p-3 rounded-lg bg-surface-container-lowest/60 text-center font-sans text-body-sm text-outline">
                    Nenhum registro encontrado nesse filtro.
                  </li>
                )}
              </ul>

              <p className="mt-3 text-center font-sans text-[11px] text-outline">
                Mostrando {filteredLog.length} de {TOTAL_VOTES.toLocaleString('pt-BR')} registros notariais
              </p>
            </section>

            {/* Danger zone */}
            <section className="bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-error/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-error text-[20px]">local_fire_department</span>
                <h2 className="font-serif font-bold text-title-lg text-error">Zona de Perigo Notarial</h2>
              </div>
              <p className="font-sans text-body-sm text-on-surface-variant leading-relaxed mb-4">
                Apaga <strong className="text-error">todos</strong> os dados locais da gala (usuários, sessões e
                agendamento). Auto-voto é golpe de estado; zerar a urna é golpe de cartório.
              </p>
              <button
                type="button"
                onClick={wipeAll}
                className="w-full px-4 py-2.5 rounded-xl bg-error-container/40 hover:bg-error-container/60 text-error font-sans font-bold text-body-md border border-error/30 hover:shadow-[0_0_20px_rgba(147,0,10,0.3)] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                Zerar Tudo Agora
              </button>
            </section>
          </aside>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-highest/95 backdrop-blur-xl px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-primary-container/30">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span className="font-sans text-body-md text-on-surface">{toast}</span>
        </div>
      )}
    </div>
  )
}
