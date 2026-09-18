/**
 * NomineeCard — card de indicado da cédula.
 *
 * Estados:
 *  - default: borda outline-variant/30, hover com borda primary/40 e leve elevação.
 *  - selected: borda primary (1.5px) + brilho dourado + check em círculo primary.
 *  - disabled (auto-voto): opacidade reduzida, gavel/lock, cursor-not-allowed, sem onClick.
 *
 * Base visual: cards da cédula desktop + tratamento de auto-voto da urna mobile.
 */
export default function NomineeCard({ nominee, selected = false, disabled = false, onSelect = () => {} }) {
  const initial = (nominee.name || '?').trim().charAt(0).toUpperCase()

  // ---- Estado bloqueado: auto-voto es golpe ----
  if (disabled) {
    return (
      <div className="group relative w-full rounded-xl p-5 bg-surface-container-low opacity-50 cursor-not-allowed select-none border border-outline-variant/30">
        {/* Badge de alerta cómica */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-error">
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            <span className="font-sans font-bold text-label-sm uppercase tracking-wider">voto não permitido (auto-voto é golpe)</span>
          </span>
          <span className="material-symbols-outlined text-outline text-[18px]">lock</span>
        </div>

        {/* Perfil + icono */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center text-outline shrink-0">
              <span className="font-serif font-bold text-title-md">{initial}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-sans font-semibold text-body-md text-outline truncate">{nominee.name}</span>
              <span className="font-sans text-body-sm text-outline truncate">{nominee.handle}</span>
            </div>
          </div>
          {nominee.icon && (
            <span className="material-symbols-outlined text-outline text-[18px]">{nominee.icon}</span>
          )}
        </div>

        {/* Pitch */}
        <p className="mt-3 font-sans text-body-sm text-outline italic leading-snug">
          “{nominee.pitch}”
        </p>
      </div>
    )
  }

  // ---- Estados seleccionable / seleccionado ----
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'group relative w-full text-left rounded-xl p-5 transition-all duration-300',
        selected
          ? 'bg-surface-container/90 backdrop-blur-md border border-primary shadow-[0_0_18px_rgba(212,175,55,0.25)]'
          : 'bg-surface-container/60 backdrop-blur-md border border-outline-variant/30 shadow-md hover:border-primary/40 hover:bg-surface-container-high/70 hover:-translate-y-0.5',
      ].join(' ')}
    >
      {/* Sheen dorado sutil cuando está seleccionado */}
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none rounded-xl" />
      )}

      {/* Check em círculo primary (canto superior) */}
      {selected && (
        <div className="absolute -top-2.5 right-4 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.6)]">
          <span className="material-symbols-outlined text-on-primary text-[16px] font-bold">check</span>
        </div>
      )}

      {/* Perfil + icono */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${selected ? 'bg-primary text-on-primary shadow-[0_0_14px_rgba(212,175,55,0.4)]' : 'bg-primary/15 text-primary border border-primary-container/30'}`}>
            <span className="font-serif font-bold text-title-md">{initial}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`font-sans font-semibold text-body-md truncate ${selected ? 'text-primary' : 'text-on-surface group-hover:text-primary'}`}>
              {nominee.name}
            </span>
            <span className="font-sans text-body-sm text-on-surface-variant truncate">{nominee.handle}</span>
          </div>
        </div>
        {nominee.icon && (
          <span className={`material-symbols-outlined text-[18px] ${selected ? 'text-primary' : 'text-outline'}`}>{nominee.icon}</span>
        )}
      </div>

      {/* Pitch */}
      <p className="relative mt-3 font-sans text-body-sm text-on-surface-variant leading-relaxed">
        {nominee.pitch}
      </p>
    </button>
  )
}