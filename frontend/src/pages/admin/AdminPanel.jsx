import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeaderAdmin } from '../../components/Header'
import useAdminAuth from '../../hooks/useAdminAuth'
import useAuth from '../../hooks/useAuth'
import useGalaState from '../../hooks/useGalaState'
import useGalaEvents from '../../hooks/useGalaEvents'
import apiFetch, { extractErrorDetail } from '../../utils/api'

/**
 * AdminPanel — Painel de Controle Soberano da Academia.
 *
 * Estado REAL (sem mocks):
 *   - stats ao vivo via useGalaEvents (stream SSE) com fallback do
 *     useGalaState (GET /api/state, buscado no mount);
 *   - CRUD de categorias e indicados em /api/admin/categories e
 *     /api/admin/nominees (Bearer do admin);
 *   - agendamento do reveal em PUT /api/admin/settings;
 *   - ata notarial real em GET /api/admin/audit.
 *
 * "Zerar Tudo" continua limpando apenas as chaves pg_* locais — os votos e as
 * candidaturas REAIS permanecem no banco do servidor.
 * Conteúdo puro: o shell (header global, footer) pertence a AdminPage.
 */

/** Converte ISO em valor aceito pelo input datetime-local (hora local). */
function toLocalInputValue(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Rótulos pt-BR das ações gravadas na ata pelo backend. */
const AUDIT_LABELS = {
  categoria_criada: 'Categoria criada',
  categoria_editada: 'Categoria editada',
  categoria_excluida: 'Categoria excluída',
  indicado_adicionado: 'Indicado adicionado',
  indicado_removido: 'Indicado removido',
  agendamento_alterado: 'Agendamento alterado',
  cerimonia_comando: 'Comando de cerimônia',
}

/** Formata o created_at da ata (ISO do FastAPI) no fuso do navegador. */
function formatAuditTime(raw) {
  if (!raw) return '—'
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR')
}

/** Contadores: número vira "1.482"; ausência vira "—". */
function formatCount(value) {
  return typeof value === 'number' ? value.toLocaleString('pt-BR') : '—'
}

function StatCard({ icon, label, value, detail, live }) {
  return (
    <div className="bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="flex items-center gap-2 mb-3">
        <span className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        </span>
        <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">{label}</span>
        {live && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-sans font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ao vivo
          </span>
        )}
      </div>
      <p className="font-serif font-bold text-[28px] leading-8 text-on-surface">{value}</p>
      <p className="font-sans text-body-sm text-outline mt-1">{detail}</p>
    </div>
  )
}

/** Linha real de indicado: @username + pitch + ação de remover. */
function NomineeRow({ nominee, onRemove }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30">
      <div className="min-w-0 flex-1">
        <p className="font-sans font-semibold text-body-md text-on-surface">
          @{nominee.username}
        </p>
        <p className="font-sans text-body-sm text-on-surface-variant leading-relaxed mt-0.5">
          {nominee.pitch || 'Sem pitch registrado.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remover indicado"
        className="shrink-0 w-8 h-8 rounded-lg bg-surface-container-high hover:bg-error-container/40 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]">person_remove</span>
      </button>
    </div>
  )
}

function CategoryCard({ category, onEdit, onDelete, onAddNominee, onRemoveNominee }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [username, setUsername] = useState('')
  const [pitch, setPitch] = useState('')
  const [saving, setSaving] = useState(false)

  const candidacies = Array.isArray(category.candidacies) ? category.candidacies : []
  const modoLabel = category.modo === 'aberta' ? 'Aberta' : 'Candidatos'

  async function submitNominee(e) {
    e.preventDefault()
    const label = username.trim()
    if (!label) return
    setSaving(true)
    const ok = await onAddNominee(category.id, label, pitch.trim())
    setSaving(false)
    if (ok) {
      setUsername('')
      setPitch('')
      setAdding(false)
    }
  }

  return (
    <div className="bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-3xl" aria-hidden="true">{category.emoji || '🏆'}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif font-bold text-title-lg text-on-surface">{category.title}</h3>
              <span className="px-2 py-0.5 rounded bg-primary-container/15 border border-primary-container/30 text-primary-fixed text-[10px] font-mono uppercase tracking-wider">
                ordem {category.reveal_order}º
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/40 text-outline text-[10px] font-mono uppercase tracking-wider">
                {modoLabel}
              </span>
            </div>
            <p className="font-sans text-body-sm text-on-surface-variant mt-1">
              {candidacies.length} {candidacies.length === 1 ? 'indicado homologado' : 'indicados homologados'}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(category)}
            title="Editar categoria"
            className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(category)}
            title="Excluir categoria"
            className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-error-container/40 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/50 text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">{open ? 'expand_less' : 'expand_more'}</span>
            {open ? 'Recolher' : 'Indicados'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-wider">
              Indicados Oficiais Homologados ({candidacies.length} concorrentes)
            </span>
            <button
              type="button"
              onClick={() => setAdding((a) => !a)}
              title="Adicionar indicado"
              className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
            </button>
          </div>

          {adding && (
            <form
              onSubmit={submitNominee}
              className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-lowest/60 border border-primary/20"
            >
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username do indicado (ex.: BetoChave)"
                maxLength={30}
                className="w-full rounded-lg bg-surface-container-lowest/90 text-on-surface px-3.5 py-2 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner border border-outline-variant/40 focus:border-primary/50 transition-all"
              />
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="Pitch (até 280 caracteres)"
                maxLength={280}
                rows={2}
                className="w-full rounded-lg bg-surface-container-lowest/90 text-on-surface px-3.5 py-2 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner border border-outline-variant/40 focus:border-primary/50 transition-all resize-none"
              />
              <p className="font-sans text-[11px] text-outline">
                sem conta? criamos um convidado automático
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-sans text-body-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !username.trim()}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-semibold text-body-sm shadow-[0_0_12px_rgba(212,175,55,0.3)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          )}

          {candidacies.length === 0 ? (
            <p className="p-3 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 text-center font-sans text-body-sm text-outline">
              Nenhum indicado homologado ainda.
            </p>
          ) : (
            candidacies.map((n) => (
              <NomineeRow
                key={n.id}
                nominee={n}
                onRemove={() => onRemoveNominee(category, n)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminPanel() {
  const { admin, logoutAdmin } = useAdminAuth()
  const { logout } = useAuth()
  const navigate = useNavigate()

  // Fonte de verdade do reveal + contadores (GET /api/state no mount).
  const {
    votacaoAberta,
    revealAt,
    totalVotos: totalVotosState,
    totalUsers: totalUsersState,
    totalCandidatos: totalCandidatosState,
    loading: stateLoading,
    refresh,
  } = useGalaState()

  // Stream SSE: totais ao vivo quando o admin também está logado como eleitor.
  const { totals, status: streamStatus, onEvent } = useGalaEvents()

  const [revealInput, setRevealInput] = useState('')
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('')

  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const [categoryForm, setCategoryForm] = useState(null)

  const [auditLog, setAuditLog] = useState([])
  // Carga da ata: esqueleto enquanto o GET roda; o fetch só dispara com
  // sessão soberana ativa (lazy: sem admin logado, nem chama o endpoint).
  const [auditLoading, setAuditLoading] = useState(false)

  // Espelha o estado real no input: agenda preenchida ou vazio (null limpa).
  useEffect(() => {
    setRevealInput(revealAt ? toLocalInputValue(revealAt) : '')
  }, [revealAt])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  /** Lista REAL de categorias (GET /api/categories, sem auth). */
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true)
    const res = await apiFetch('/api/categories')
    if (res.ok && Array.isArray(res.data)) {
      setCategories(res.data)
      setCategoriesError('')
    } else {
      setCategoriesError('Falha ao sincronizar as categorias com o cartório.')
    }
    setCategoriesLoading(false)
  }, [])

  /** Ata notarial REAL (GET /api/admin/audit, Bearer do admin). */
  const loadAudit = useCallback(async () => {
    const token = admin?.token
    if (!token) return
    setAuditLoading(true)
    const res = await apiFetch('/api/admin/audit', { token })
    if (res.ok && Array.isArray(res.data)) {
      setAuditLog(res.data)
    }
    setAuditLoading(false)
  }, [admin?.token])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    loadAudit()
  }, [loadAudit])

  // Comandos de cerimônia vivem no /reveal; quando o stream avisa um passo,
  // a ata do painel se atualiza sozinha (se o admin estiver logado como user).
  useEffect(() => {
    return onEvent((evt) => {
      if (evt.type === 'ceremony.step') loadAudit()
    })
  }, [onEvent, loadAudit])

  // ---- Stats ao vivo (stream > GET /api/state > "—") ----
  // Contadores: o stream só traz números confiáveis; ausência cai no estado.
  // Urna/reveal: fonte é o useGalaState — o broadcast de categorias/indicados
  // envia um state.change PARCIAL (sem votacao_aberta/reveal_at), e o provider
  // assume "aberta" por padrão nesse caso. Evitamos esse falso positivo.
  const totalVotos = totals?.totalVotos ?? totalVotosState
  const totalUsers = totals?.totalUsers ?? totalUsersState
  const totalCandidatos = totals?.totalCandidatos ?? totalCandidatosState
  const votacaoAbertaLive = votacaoAberta
  const revealAtLive = revealAt

  const statCards = [
    {
      icon: 'fact_check',
      label: 'Votos Computados',
      value: formatCount(totalVotos),
      detail: 'apuração em sigilo',
      live: streamStatus === 'conectado',
    },
    {
      icon: 'groups',
      label: 'Concorrentes',
      value: formatCount(totalCandidatos),
      detail: 'candidaturas homologadas',
    },
    {
      icon: 'how_to_vote',
      label: 'Eleitores na Gala',
      value: formatCount(totalUsers),
      detail: 'chaves notariais ativas',
    },
    {
      icon: 'lock',
      label: 'Estado da Urna',
      value: votacaoAbertaLive ? 'Aberta' : 'Fechada',
      detail: revealAtLive ? revealAtLive.toLocaleString('pt-BR') : 'sem agendamento',
    },
  ]

  // ---- Agendamento do reveal (PUT /api/admin/settings) ----
  async function saveReveal(e) {
    e.preventDefault()
    // Input vazio é INTENCIONAL: envia null e limpa o agendamento no servidor.
    const token = admin?.token
    if (!token) {
      showToast('Sessão admin sem token: entre novamente para agendar.')
      return
    }
    const res = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      // Omite votacao_aberta para preservar o estado configurado no servidor.
      // FIX do fuso: enviamos o datetime-local LITERAL (fuso de parede,
      // "2026-09-25T23:50") — NÃO converta para toISOString (UTC). Antes, o
      // caminho local→UTC→SQLite naive→leitura como local somava +3h em cada
      // salvamento. O backend (dateTime sem fuso) espera exatamente esta forma.
      // Input vazio envia null explícito: o backend agora LIMPA o agendamento.
      body: { reveal_at: revealInput || null },
      token,
    })
    if (res.ok) {
      refresh()
      loadAudit()
      showToast('Agendamento notarial registrado com sucesso!')
    } else {
      showToast(
        extractErrorDetail(
          res.data,
          'Falha ao registrar no cartório — verifique a sessão soberana.'
        )
      )
    }
  }

  // ---- CRUD de categorias ----
  function openNewCategory() {
    const maxOrder = categories.reduce(
      (max, c) => Math.max(max, Number(c.reveal_order) || 0),
      0
    )
    setCategoryForm({
      id: null,
      title: '',
      emoji: '',
      modo: 'candidatos',
      reveal_order: maxOrder + 1,
    })
  }

  function openEditCategory(category) {
    setCategoryForm({
      id: category.id,
      title: category.title,
      emoji: category.emoji || '',
      modo: category.modo || 'candidatos',
      reveal_order: category.reveal_order,
    })
  }

  async function submitCategory(e) {
    e.preventDefault()
    const token = admin?.token
    if (!token) {
      showToast('Sessão admin sem token: entre novamente para salvar.')
      return
    }

    const payload = {
      title: categoryForm.title.trim(),
      emoji: categoryForm.emoji.trim(),
      modo: categoryForm.modo,
      reveal_order: Number(categoryForm.reveal_order),
    }
    if (!payload.title) {
      showToast('Informe o título da categoria.')
      return
    }
    if (!Number.isFinite(payload.reveal_order) || payload.reveal_order < 1) {
      showToast('A ordem do reveal deve ser um número maior que zero.')
      return
    }

    const isEdit = Boolean(categoryForm.id)
    const res = await apiFetch(
      isEdit ? `/api/admin/categories/${categoryForm.id}` : '/api/admin/categories',
      {
        method: isEdit ? 'PUT' : 'POST',
        body: payload,
        token,
      }
    )

    if (res.ok) {
      showToast(
        isEdit
          ? 'Categoria atualizada no cartório'
          : 'Categoria instituída no cartório'
      )
      setCategoryForm(null)
      await loadCategories()
      await loadAudit()
      refresh()
    } else {
      showToast(extractErrorDetail(res.data, 'Falha ao salvar a categoria.'))
    }
  }

  async function deleteCategory(category) {
    const token = admin?.token
    if (!token) {
      showToast('Sessão admin sem token: entre novamente para excluir.')
      return
    }
    const confirmed = window.confirm(
      'Isso apaga a categoria E os votos/candidaturas dela (cascata). Continuar?'
    )
    if (!confirmed) return

    const res = await apiFetch(`/api/admin/categories/${category.id}`, {
      method: 'DELETE',
      token,
    })
    if (res.ok) {
      showToast('Categoria removida da ata')
      await loadCategories()
      await loadAudit()
      refresh()
    } else {
      showToast(extractErrorDetail(res.data, 'Falha ao excluir a categoria.'))
    }
  }

  // ---- Gestão de indicados ----
  async function addNominee(categoryId, username, pitch) {
    const token = admin?.token
    if (!token) {
      showToast('Sessão admin sem token: entre novamente para indicar.')
      return false
    }
    const res = await apiFetch('/api/admin/nominees', {
      method: 'POST',
      body: { category_id: categoryId, username, pitch },
      token,
    })
    if (res.ok) {
      showToast('Indicado homologado no cartório')
      await loadCategories()
      await loadAudit()
      refresh()
      return true
    }
    showToast(extractErrorDetail(res.data, 'Falha ao adicionar o indicado.'))
    return false
  }

  async function removeNominee(category, nominee) {
    const token = admin?.token
    if (!token) {
      showToast('Sessão admin sem token: entre novamente para remover.')
      return
    }
    const confirmed = window.confirm(
      `Remover @${nominee.username} de "${category.title}"? Os votos recebidos nessa categoria também serão apagados.`
    )
    if (!confirmed) return

    const res = await apiFetch(`/api/admin/nominees/${nominee.id}`, {
      method: 'DELETE',
      token,
    })
    if (res.ok) {
      showToast('Indicado removido da ata')
      await loadCategories()
      await loadAudit()
      refresh()
    } else {
      showToast(extractErrorDetail(res.data, 'Falha ao remover o indicado.'))
    }
  }

  function wipeAll() {
    const confirmed = window.confirm(
      'Isso apagará os dados LOCAIS da gala (sessão e agendamento no navegador). Votos e candidaturas reais continuam no servidor. Continuar?'
    )
    if (!confirmed) return
    Object.keys(localStorage)
      .filter((k) => k.startsWith('pg_'))
      .forEach((k) => localStorage.removeItem(k))
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('pg_'))
      .forEach((k) => sessionStorage.removeItem(k))
    // Sincroniza os providers ANTES de sair: sem isso, Header e painel
    // continuariam exibindo sessões ativas até o próximo reload.
    logoutAdmin()
    logout()
    // Home em estado limpo — o redirect é o feedback principal da ação.
    navigate('/', { replace: true })
  }

  // Ata: exibe do mais recente para o mais antigo (o endpoint devolve
  // cronológico). O filtro cobre autor, ação legível e detalhe.
  const filteredLog = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const entries = [...auditLog].reverse()
    if (!q) return entries
    return entries.filter((entry) => {
      const label = AUDIT_LABELS[entry.action] || entry.action
      return `${entry.actor || ''} ${label} ${entry.detail || ''}`
        .toLowerCase()
        .includes(q)
    })
  }, [auditLog, filter])

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
              <span className={`w-2 h-2 rounded-full ${votacaoAbertaLive ? 'bg-emerald-400 animate-pulse' : 'bg-error'}`} />
              <span>
                Servidor da Gala:{' '}
                <strong className={votacaoAbertaLive ? 'text-emerald-400' : 'text-error'}>
                  {votacaoAbertaLive ? '100% Calmo & Alinhado' : 'Urnas lacradas'}
                </strong>
              </span>
              <span className="text-outline">•</span>
              <span className="material-symbols-outlined text-primary text-[14px]">
                {votacaoAbertaLive ? 'lock_open' : 'lock'}
              </span>
              <span className="text-primary">
                {votacaoAbertaLive ? 'ABERTA COM URNAS AQUECIDAS' : 'FECHADA PARA APURAÇÃO'}
              </span>
            </div>
          </div>

          {/* Agendamento do reveal — FUNCIONAL (PUT /api/admin/settings) */}
          <form onSubmit={saveReveal} className="bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">calendar_clock</span>
              <span className="font-sans font-bold text-label-md text-secondary uppercase tracking-wider">Reveal Automático</span>
            </div>
            <input
              type="datetime-local"
              value={revealInput}
              onChange={(e) => setRevealInput(e.target.value)}
              className="w-full rounded-xl bg-surface-container-lowest/90 text-on-surface px-4 py-2.5 font-sans text-body-md text-[color-scheme:dark] focus:outline-none focus:bg-surface-container-low shadow-inner border border-outline-variant/40 focus:border-primary/50 transition-all"
            />
            <button
              type="submit"
              disabled={stateLoading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-semibold text-body-md shadow-[0_0_16px_rgba(212,175,55,0.35)] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              Salvar Agendamento
            </button>
            <p className="font-sans text-[11px] text-outline leading-tight">
              Salvo no cartório via <code className="text-secondary">PUT /api/admin/settings</code> e lido por
              toda a gala em <code className="text-secondary">GET /api/state</code>. Deixe vazio para limpar o
              agendamento.
            </p>
          </form>
        </section>

        {/* ---- Stats reais (stream + /api/state) ---- */}
        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {statCards.map((s) => (
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
                onClick={openNewCategory}
                disabled={categoriesLoading}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-semibold text-body-md shadow-[0_0_16px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Nova
              </button>
            </div>

            {/* Formulário inline de criação/edição */}
            {categoryForm && (
              <form
                onSubmit={submitCategory}
                className="bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-primary/20 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">category</span>
                    <span className="font-sans font-bold text-label-md text-secondary uppercase tracking-wider">
                      {categoryForm.id ? 'Editar categoria' : 'Nova categoria'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategoryForm(null)}
                    title="Fechar formulário"
                    className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <label className="sm:col-span-6 flex flex-col gap-1">
                    <span className="font-sans text-[11px] text-outline uppercase tracking-wider">Título</span>
                    <input
                      type="text"
                      value={categoryForm.title}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, title: e.target.value }))}
                      maxLength={80}
                      placeholder="Melhor Meme do Ano"
                      className="w-full rounded-lg bg-surface-container-lowest/90 text-on-surface px-3.5 py-2 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner border border-outline-variant/40 focus:border-primary/50 transition-all"
                    />
                  </label>
                  <label className="sm:col-span-2 flex flex-col gap-1">
                    <span className="font-sans text-[11px] text-outline uppercase tracking-wider">Emoji</span>
                    <input
                      type="text"
                      value={categoryForm.emoji}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, emoji: e.target.value }))}
                      maxLength={8}
                      placeholder="🏆"
                      className="w-full rounded-lg bg-surface-container-lowest/90 text-on-surface px-3.5 py-2 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner border border-outline-variant/40 focus:border-primary/50 transition-all"
                    />
                  </label>
                  <label className="sm:col-span-2 flex flex-col gap-1">
                    <span className="font-sans text-[11px] text-outline uppercase tracking-wider">Modo</span>
                    <select
                      value={categoryForm.modo}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, modo: e.target.value }))}
                      className="w-full rounded-lg bg-surface-container-lowest/90 text-on-surface px-3.5 py-2 font-sans text-body-md focus:outline-none focus:bg-surface-container-low shadow-inner border border-outline-variant/40 focus:border-primary/50 transition-all"
                    >
                      <option value="candidatos">Candidatos</option>
                      <option value="aberta">Aberta</option>
                    </select>
                  </label>
                  <label className="sm:col-span-2 flex flex-col gap-1">
                    <span className="font-sans text-[11px] text-outline uppercase tracking-wider">Ordem</span>
                    <input
                      type="number"
                      min="1"
                      value={categoryForm.reveal_order}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, reveal_order: e.target.value }))}
                      className="w-full rounded-lg bg-surface-container-lowest/90 text-on-surface px-3.5 py-2 font-sans text-body-md focus:outline-none focus:bg-surface-container-low shadow-inner border border-outline-variant/40 focus:border-primary/50 transition-all"
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-semibold text-body-md shadow-[0_0_16px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    {categoryForm.id ? 'Salvar Alterações' : 'Instituir Categoria'}
                  </button>
                </div>
              </form>
            )}

            {categoriesLoading && (
              <p className="p-3 rounded-xl bg-surface-container-lowest/60 text-center font-sans text-body-sm text-outline animate-pulse">
                Sincronizando categorias com o cartório...
              </p>
            )}

            {!categoriesLoading && categoriesError && (
              <p className="p-3 rounded-xl bg-error-container/20 border border-error/30 text-center font-sans text-body-sm text-error">
                {categoriesError}
              </p>
            )}

            {!categoriesLoading && !categoriesError && categories.length === 0 && (
              <p className="p-3 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 text-center font-sans text-body-sm text-outline">
                Nenhuma categoria instituída. Crie a primeira no botão "Nova".
              </p>
            )}

            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onEdit={openEditCategory}
                onDelete={deleteCategory}
                onAddNominee={addNominee}
                onRemoveNominee={removeNominee}
              />
            ))}
          </section>

          {/* Coluna lateral: audit log + danger zone */}
          <aside className="xl:col-span-5 flex flex-col gap-6">
            {/* Audit log REAL */}
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
                placeholder="Filtrar por autor, ação ou detalhe..."
                className="w-full rounded-lg bg-surface-container-lowest/90 text-on-surface px-3.5 py-2 font-sans text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-low shadow-inner border border-outline-variant/40 focus:border-primary/50 transition-all mb-3"
              />

              <ul className="flex flex-col gap-2">
                {auditLoading &&
                  [1, 2, 3].map((n) => (
                    <li key={`skeleton-${n}`} className="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/30" aria-hidden="true">
                      <div className="h-4 w-3/4 rounded bg-surface-container-high/70 animate-pulse" />
                      <div className="h-3 w-1/2 rounded bg-surface-container-high/50 animate-pulse mt-1.5" />
                    </li>
                  ))}
                {!auditLoading &&
                  filteredLog.map((entry) => (
                    <li key={entry.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/30">
                      <div className="min-w-0">
                        <p className="font-sans font-semibold text-body-sm text-on-surface truncate">
                          <span className="text-primary">{entry.actor}</span>
                          <span className="text-outline"> • </span>
                          <span>{AUDIT_LABELS[entry.action] || entry.action}</span>
                        </p>
                        {entry.detail && (
                          <p className="font-sans text-[11px] text-on-surface-variant truncate">
                            {entry.detail}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 font-sans text-[10px] text-outline text-right">
                        {formatAuditTime(entry.created_at)}
                      </span>
                    </li>
                  ))}
                {!auditLoading && filteredLog.length === 0 && (
                  <li className="p-3 rounded-lg bg-surface-container-lowest/60 text-center font-sans text-body-sm text-outline">
                    {filter ? 'Nenhum registro encontrado nesse filtro.' : 'Nada registrado na ata ainda.'}
                  </li>
                )}
              </ul>

              <p className="mt-3 text-center font-sans text-[11px] text-outline">
                Mostrando {filteredLog.length} de {auditLog.length} registros na ata
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
