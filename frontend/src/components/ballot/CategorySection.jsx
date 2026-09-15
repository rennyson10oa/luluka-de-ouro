import NomineeCard from './NomineeCard'

/**
 * CategorySection — sección de categoría de la cédula.
 *
 * Cabeçalho: pill "Categoria 0N" + badge "1 Voto Mandatório" (siempre, como en el
 * diseño desktop) + badge de estado que alterna entre "Seleccionada" (check) y
 * "Pendiente de Voto" — espejando los 3 estados del diseño.
 *
 * Grid de NomineeCards: grid-cols-1 sm:grid-cols-2 (apilan en mobile).
 */
export default function CategorySection({ index, category, selection, onToggle, isSelfVote }) {
  const hasSelection = Boolean(selection)

  return (
    <section className="flex flex-col gap-5">
      {/* Banner de categoría */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-5 rounded-xl bg-surface-container-low shadow-md">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center text-3xl shadow-inner shrink-0">
            {category.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-sans font-bold text-label-sm uppercase tracking-widest text-secondary">
                Categoria {String(index).padStart(2, '0')}
              </span>
              <span className="w-1 h-1 rounded-full bg-outline" />
              <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-sans font-semibold text-label-sm">
                1 Voto Mandatório
              </span>
            </div>
            <h2 className="font-serif font-bold text-headline-md text-primary">
              {category.title}
            </h2>
            <p className="font-sans text-body-md text-on-surface-variant mt-0.5">
              {category.description}
            </p>
          </div>
        </div>

        {/* Badge de estado de la categoría */}
        {hasSelection ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-sans font-bold text-label-sm">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Seleccionada
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant font-sans font-semibold text-label-sm">
            <span className="material-symbols-outlined text-[16px]">radio_button_unchecked</span>
            Pendiente de Voto
          </span>
        )}
      </div>

      {/* Grid de cards de indicados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {category.nominees.map((nominee) => (
          <NomineeCard
            key={nominee.id}
            nominee={nominee}
            selected={selection === nominee.id}
            disabled={isSelfVote(nominee)}
            onSelect={() => onToggle(category.id, nominee.id)}
          />
        ))}
      </div>
    </section>
  )
}