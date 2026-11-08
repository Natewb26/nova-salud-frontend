import { useState } from 'react'
import { Tags, Plus, Search, FolderOpen, CheckCircle2 } from 'lucide-react'
import { useCategories } from '../../context/useCategories'

export default function Categorias() {
  const { categories, addCategory } = useCategories()
  const [search, setSearch] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const filteredCategories = categories.filter((category) =>
    category.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSubmit = (event) => {
    event.preventDefault()

    const result = addCategory(newCategory)

    if (!result.success) {
      setMessage(result.message)
      setMessageType('error')
      return
    }

    setNewCategory('')
    setMessage('Categoría registrada correctamente.')
    setMessageType('success')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Categorías</h1>
        <p className="mt-1 text-sm text-slate-500">
          Organiza los productos de Nova Salud por categorías.
        </p>
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
              <p className="text-sm text-slate-500">Estado del catálogo</p>
              <p className="mt-2 text-lg font-bold text-emerald-600">
                Activo
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <CheckCircle2 size={23} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-800">
              Listado de categorías
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Categorías disponibles para clasificar productos.
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

          <div className="divide-y divide-slate-100">
            {filteredCategories.map((category, index) => (
              <div
                key={category}
                className="flex items-center gap-4 p-5 hover:bg-slate-50"
              >
                <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
                  <FolderOpen size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{category}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Categoría #{index + 1}
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Activa
                </span>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">
                No se encontraron categorías.
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            Mostrando {filteredCategories.length} de {categories.length} categorías
          </div>
        </section>

        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
              <Plus size={21} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">
                Nueva categoría
              </h2>
              <p className="text-xs text-slate-500">
                Registra una categoría.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nombre de la categoría
              </label>
              <input
                value={newCategory}
                onChange={(event) => {
                  setNewCategory(event.target.value)
                  setMessage('')
                }}
                required
                maxLength={60}
                placeholder="Ej. Productos dermatológicos"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            {message && (
              <p
                className={`text-sm ${
                  messageType === 'error'
                    ? 'text-red-600'
                    : 'text-emerald-600'
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              <Plus size={17} />
              Registrar categoría
            </button>
          </form>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            Las nuevas categorías estarán disponibles automáticamente en el
            módulo de Productos.
          </p>
        </section>
      </div>
    </div>
  )
}
