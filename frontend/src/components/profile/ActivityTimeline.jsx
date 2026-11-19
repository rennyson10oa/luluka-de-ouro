import { useEffect, useState } from 'react'
import apiFetch from '../../utils/api'
import useAuth from '../../hooks/useAuth'

/**
 * ActivityTimeline — "Atividade Recente na Assembleia" (REAL).
 *
 * Consome GET /api/audit/me: os atos que o PRÓPRIO eleitor praticou e que
 * entraram na ata notarial (voto registrado, candidatura criada...). O
 * backend filtra por actor == username do token — ninguém vê a ata alheia.
 *
 * Agrupamento por período é client-side (Hoje / Ontem / data curta), sobre
 * a lista já ordenada mais-recente-primeiro que o backend entrega.
 */

// Ação da ata → como a timeline a exibe (ícone + verbo).
const ACTIVITY_LABELS = {
  voto_registrado: { icon: 'how_to_vote', verb: 'Voto registrado' },
  candidatura_criada: { icon: 'campaign', verb: 'Candidatura criada' },
  usuario_editado: { icon: 'manage_accounts', verb: 'Perfil atualizado pelo cartório' },
}

const FALLBACK_LABEL = { icon: 'gavel', verb: 'Registro na ata' }

function periodLabel(isoDate) {
  const d = new Date(isoDate)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return 'Hoje'
  if (sameDay(d, yesterday)) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function timeLabel(isoDate) {
  return new Date(isoDate).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ActivityTimeline() {
  const { user } = useAuth()
  const [entries, setEntries] = useState(null) // null = carregando
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      const res = await apiFetch('/api/audit/me')
      if (!alive) return
      if (res.ok && Array.isArray(res.data)) {
        setEntries(res.data)
      } else {
        setError(true)
        setEntries([])
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [user?.username])

  // Agrupa em [{ period, items }] preservando a ordem (mais recente primeiro).
  const groups = []
  for (const entry of entries ?? []) {
    const period = periodLabel(entry.created_at)
    const last = groups[groups.length - 1]
    if (last && last.period === period) {
      last.items.push(entry)
    } else {
      groups.push({ period, items: [entry] })
    }
  }

  return (
    <div className="bg-surface-container-low/80 backdrop-blur-md rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">
          Atividade Recente na Assembleia
        </span>
        <span className="font-sans text-[10px] text-outline font-mono uppercase">ATA PESSOAL</span>
      </div>

      {/* Carregando */}
      {entries === null && (
        <p className="p-3 rounded-xl bg-surface-container-lowest/60 text-center text-body-sm text-outline animate-pulse">
          Consultando a ata notarial...
        </p>
      )}

      {/* Erro */}
      {entries !== null && error && (
        <p className="p-3 rounded-xl bg-error-container/20 border border-error/30 text-center text-body-sm text-error">
          Falha ao consultar a ata. Tente recarregar a página.
        </p>
      )}

      {/* Vazio */}
      {entries !== null && !error && groups.length === 0 && (
        <p className="p-3 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 text-center text-body-sm text-outline">
          Nenhum ato seu registrado na ata ainda — vote ou candidate-se para entrar na história.
        </p>
      )}

      {/* Timeline agrupada por período, linha vertical dourada */}
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.period} className="flex flex-col gap-2">
            {/* Cabeçalho do período */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
              <span className="text-label-sm text-primary font-bold uppercase tracking-wider">{group.period}</span>
            </div>

            <div className="relative pl-5">
              <div className="absolute left-2 top-1 bottom-1 w-[1px] bg-primary/40" aria-hidden="true" />
              {group.items.map((entry) => {
                const label = ACTIVITY_LABELS[entry.action] || FALLBACK_LABEL
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-primary flex-shrink-0">
                        {label.icon}
                      </span>
                      <span className="text-body-sm text-on-surface truncate" title={entry.detail}>
                        {label.verb}
                        {entry.detail ? (
                          <span className="text-on-surface-variant"> — {entry.detail}</span>
                        ) : null}
                      </span>
                    </div>
                    <span className="text-on-surface-variant text-label-sm shrink-0">
                      {timeLabel(entry.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
