import { MOCK_ACTIVITY } from '../../data/mockProfile'

/**
 * ActivityTimeline — "Atividade Recente na Assembleia".
 * Timeline agrupada por período (Hoje/Ontem) con línea vertical dorada.
 * Datos cenográficos (MOCK_ACTIVITY) hasta que el backend los exponga.
 */
export default function ActivityTimeline() {
  return (
    <div className="bg-surface-container-low/80 backdrop-blur-md rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">
          Atividade Recente na Assembleia
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {MOCK_ACTIVITY.map((group) => (
          <div key={group.period} className="flex flex-col gap-2">
            {/* Cabeçalho do período */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
              <span className="text-label-sm text-primary font-bold uppercase tracking-wider">{group.period}</span>
            </div>

            {/* Items com linha vertical dourada */}
            <div className="relative pl-5">
              <div className="absolute left-2 top-1 bottom-1 w-[1px] bg-primary/40" aria-hidden="true" />
              {group.items.map((item) => (
                <div key={`${group.period}-${item.text}-${item.time}`} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-primary flex-shrink-0">{item.icon}</span>
                    <span className="text-body-sm text-on-surface truncate">
                      {item.text}
                      {item.detail ? <strong className="text-primary-fixed"> {item.detail}</strong> : null}
                    </span>
                  </div>
                  <span className="text-on-surface-variant text-label-sm shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}