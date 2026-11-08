import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
  Tags,
} from 'lucide-react'
import { getErrorMessage } from '../../services/apiErrors'
import { getCategorias } from '../../services/inventoryService'

const EMPTY_CATEGORIES = []

const categoryId = (category, index) =>
  category?.id_categoria ?? category?.id ?? category?.nombre ?? category ?? index

const categoryName = (category) =>
  category?.nombre ?? category?.name ?? String(category ?? '')

export default function Categorias() {
  const [search, setSearch] = useState('')
  const categoriesQuery = useQuery({
    queryKey: ['categorias'],
    queryFn: getCategorias,
  })

  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES
  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es')
    if (!normalizedSearch) return categories

    return categories.filter((category) =>
      categoryName(category).toLocaleLowerCase('es').includes(normalizedSearch),
    )
  }, [categories, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categorías</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta las categorías registradas en el catálogo de Nova Salud.
          </p>
        </div>
        <button
          type="button"
          onClick={() => categoriesQuery.refetch()}
          disabled={categoriesQuery.isFetching}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={categoriesQuery.isFetching ? 'animate-spin' : ''}
          />
          Actualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Categorías registradas</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {categories.length}
              </p>
            </div>
            <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
              <Tags size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Origen del catálogo</p>
              <p className="mt-2 text-lg font-bold text-emerald-600">
                API conectada
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <CheckCircle2 size={23} />
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-800">Listado de categorías</h2>
          <p className="mt-1 text-sm text-slate-500">
            Categorías devueltas por el servicio de inventario.
          </p>

          <div className="relative mt-4">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar categoría..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {categoriesQuery.isError && (
          <div className="m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                No se pudieron cargar las categorías
              </p>
              <p className="mt-1 text-sm">
                {getErrorMessage(categoriesQuery.error)}
              </p>
            </div>
          </div>
        )}

        {categoriesQuery.isPending ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            Cargando categorías...
          </div>
        ) : !categoriesQuery.isError && filteredCategories.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredCategories.map((category, index) => (
              <div
                key={categoryId(category, index)}
                className="flex items-center gap-4 p-5 hover:bg-slate-50"
              >
                <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
                  <FolderOpen size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">
                    {categoryName(category)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Categoría #{index + 1}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Activa
                </span>
              </div>
            ))}
          </div>
        ) : !categoriesQuery.isError ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No se encontraron categorías.
          </div>
        ) : null}

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Mostrando {filteredCategories.length} de {categories.length} categorías
        </div>
      </section>
    </div>
  )
}
