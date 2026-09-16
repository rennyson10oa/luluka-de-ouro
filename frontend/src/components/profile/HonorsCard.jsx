import { MOCK_HONORS } from '../../data/mockProfile'

/**
 * HonorsCard — "Histórico Notarial e Condecorações".
 * Lista cenográfica de honrarias mock (ícono + título + tier pill + desc).
 */
export default function HonorsCard() {
  return (
    <div className="bg-surface-container/60 backdrop-blur-lg rounded-2xl p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary text-[20px]">history_edu</span>
        <h4 className="font-serif font-bold text-title-md text-on-surface">Histórico Notarial e Condecorações</h4>
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_HONORS.map((h) => (
          <div
            key={h.title}
            className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest/60 hover:bg-surface-container-lowest transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[16px]">{h.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="font-sans font-semibold text-body-md text-on-surface truncate">{h.title}</div>
                <div className="font-sans text-label-sm text-on-surface-variant truncate">{h.desc}</div>
              </div>
            </div>
            <span className="bg-primary/20 text-primary text-label-sm px-2 py-0.5 rounded uppercase font-bold shrink-0">
              {h.tier}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}