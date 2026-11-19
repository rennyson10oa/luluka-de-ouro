import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * UserPicker — combobox de eleitores com busca (username OU vulgo).
 *
 * Uma implementação, dois consumidores:
 *   - SuggestionModal → GET /api/users/directory (só eleitores reais);
 *   - AdminPanel (indicados) → GET /api/admin/users (convidados INCLUÍDOS,
 *     com badge — o admin pode criar candidatura para convidado).
 *
 * Props:
 *   value        — seleção atual: { id, username, vulgo, is_guest? } | null.
 *   onChange     — (user | null) => void.
 *   loadOptions  — async () => lista de usuários (formato acima). Opcional;
 *                  prefira `options` se a lista já vier carregada do pai.
 *   options      — lista pronta (evita refetch quando o pai já tem os dados).
 */
export default function UserPicker({ value, onChange, loadOptions, options }) {
  const [fetched, setFetched] = useState(null) // resultado de loadOptions
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (loadOptions && !fetched) {
      let alive = true
      setLoading(true)
      loadOptions()
        .then((list) => {
          if (alive) setFetched(Array.isArray(list) ? list : [])
        })
        .catch(() => {
          if (alive) setFetched([])
        })
        .finally(() => {
          if (alive) setLoading(false)
        })
      return () => {
        alive = false
      }
    }
    return undefined
  }, [loadOptions, fetched])

  // Fecha o dropdown ao clicar fora (combobox de verdade).
  useEffect(() => {
    if (!open) return undefined
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const list = options || fetched || []
  const query = search.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      list.filter(
        (u) => `${u.username} ${u.vulgo || ''}`.toLowerCase().includes(query)
      ),
    [list, query]
  )

  function pick(u) {
    onChange(u)
    setSearch('')
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={value ? `@${value.username}` : search}
        onChange={(e) => {
          onChange(null) // editar limpa a seleção
          setSearch(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Pesquisar eleitor..."
        autoComplete="off"
        className="w-full rounded-xl bg-surface-container-lowest/90 px-4 py-3 font-sans text-body-md text-on-surface placeholder:text-outline focus:outline-none shadow-[0_0_20px_rgba(212,175,55,0.15)]"
      />
      {/* Seleção confirmada: chip com vulgo + X para trocar. */}
      {value && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container/25 text-primary font-sans text-[11px] font-bold">
          {value.vulgo || (value.is_guest ? 'convidado' : 'eleitor')}
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Trocar eleitor"
            className="hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </span>
      )}

      {/* Lista de resultados (dropdown anexo ao input). */}
      {open && !value && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/40 shadow-2xl z-20">
          {loading && (
            <p className="p-3 text-center font-sans text-body-sm text-outline animate-pulse">
              Consultando o cartório de eleitores...
            </p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="p-3 text-center font-sans text-body-sm text-outline">
              Nenhum eleitor encontrado{query ? ` para "${search}"` : ''}.
            </p>
          )}
          {!loading &&
            filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => pick(u)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-surface-container-high/70 transition-colors"
              >
                <span className="font-sans font-bold text-body-md text-on-surface">
                  @{u.username}
                  {u.is_guest && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/40 text-outline text-[9px] font-mono uppercase">
                      Convidado
                    </span>
                  )}
                </span>
                {u.vulgo && (
                  <span className="font-sans text-body-sm text-on-surface-variant truncate">
                    {u.vulgo}
                  </span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
