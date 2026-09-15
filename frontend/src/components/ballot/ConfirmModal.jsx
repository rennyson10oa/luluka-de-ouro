/**
 * ConfirmModal — modal de confirmación antes de sellar los votos.
 *
 * Overlay glassmorphism (bg-surface-container-lowest/85 + backdrop-blur-md) con
 * card central max-w-lg. Lista las elecciones actuales (o "Voto em branco" en
 * itálico outline) y ofrece "Cancelar" (ghost) / "Sim, Selar Meus Votos" (dorado).
 */
export default function ConfirmModal({ open, categories, selection, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg bg-surface-container-high/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
        {/* Gold top accent */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="p-6 sm:p-8">
          {/* Icono */}
          <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(212,175,55,0.4)]">
            <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_vote</span>
          </div>

          {/* Título */}
          <h3 className="font-serif font-bold text-headline-sm text-primary text-center mb-1">
            Selar votos na urna?
          </h3>
          <p className="font-sans text-body-md text-on-surface-variant text-center mb-6">
            Ação irreversível — a urna é secreta, nenhum ajuste é permitido após o selo.
          </p>

          {/* Resumen de elecciones actuales */}
          <div className="bg-surface-container p-4 rounded-xl mb-6">
            <ul className="space-y-2.5">
              {categories.map((cat) => {
                const nomineeId = selection[cat.id]
                const nominee = nomineeId ? cat.nominees.find((n) => n.id === nomineeId) : null
                return (
                  <li key={cat.id} className="flex items-center justify-between gap-3 py-2 border-b border-outline-variant/20 last:border-0">
                    <span className="font-sans text-body-sm text-on-surface-variant truncate">
                      {cat.emoji} {cat.title}
                    </span>
                    {nominee ? (
                      <span className="font-sans font-semibold text-body-sm text-primary truncate">{nominee.name}</span>
                    ) : (
                      <span className="font-sans italic text-body-sm text-outline">Voto em branco</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-sans font-semibold text-body-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-body-md shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              Sim, Selar Meus Votos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}