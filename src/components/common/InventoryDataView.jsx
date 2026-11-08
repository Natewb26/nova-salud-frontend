import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, RefreshCw, Search, Table2, X } from 'lucide-react'

const columnLabels = {
  id_producto: 'ID producto',
  id_lote: 'ID lote',
  id_movimiento: 'ID movimiento',
  nombre: 'Producto',
  producto: 'Producto',
  codigo: 'Código',
  codigo_barras: 'Código de barras',
  sku: 'Código',
  categoria: 'Categoría',
  stock: 'Stock',
  stock_actual: 'Stock actual',
  stock_disponible: 'Stock disponible',
  stock_minimo: 'Stock mínimo',
  cantidad: 'Cantidad',
  disponible: 'Disponible',
  faltante: 'Faltante',
  precio: 'Precio',
  costo: 'Costo',
  fecha: 'Fecha',
  fecha_vencimiento: 'Vencimiento',
  fecha_ingreso: 'Fecha de ingreso',
  fecha_movimiento: 'Fecha del movimiento',
  dias_para_vencer: 'Días para vencer',
  tipo: 'Tipo',
  motivo: 'Motivo',
  estado: 'Estado',
  unidad: 'Unidad',
}

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const formatColumnName = (key) =>
  columnLabels[key] ||
  key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const formatValue = (key, value) => {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  if (
    typeof value === 'string' &&
    /fecha|date|created_at|updated_at/i.test(key)
  ) {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

    if (dateOnly) {
      const [, year, month, day] = dateOnly
      return `${day}/${month}/${year}`
    }

    const parsedDate = new Date(value)

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString('es-PE')
    }
  }

  if (key === 'dias_para_vencer') {
    const days = Number(value)
    return `${days} ${days === 1 ? 'día' : 'días'}`
  }

  return String(value)
}

const getStatusClass = (value) => {
  const status = normalizeText(value)

  if (
    status.includes('agotado') ||
    status.includes('vencido') ||
    status.includes('inactivo')
  ) {
    return 'bg-red-50 text-red-700'
  }

  if (
    status.includes('bajo') ||
    status.includes('proximo') ||
    status.includes('pendiente')
  ) {
    return 'bg-amber-50 text-amber-700'
  }

  if (
    status.includes('activo') ||
    status.includes('registrada') ||
    status.includes('disponible')
  ) {
    return 'bg-emerald-50 text-emerald-700'
  }

  return 'bg-slate-100 text-slate-700'
}

export default function InventoryDataView({
  titulo,
  descripcion,
  loader,
}) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetchRecords = useCallback(async () => {
    const data = await loader()

    if (!Array.isArray(data)) {
      throw new Error('La información recibida no tiene el formato esperado.')
    }

    return data
  }, [loader])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchRecords()
      setRecords(data)
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudo cargar la información.',
      )
    } finally {
      setLoading(false)
    }
  }, [fetchRecords])

  useEffect(() => {
    let active = true

    fetchRecords()
      .then((data) => {
        if (!active) return
        setRecords(data)
        setError('')
      })
      .catch((err) => {
        if (!active) return

        setError(
          err.response?.data?.error ||
            err.message ||
            'No se pudo cargar la información.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fetchRecords])

  const columns = useMemo(
    () => [...new Set(records.flatMap((record) => Object.keys(record)))],
    [records],
  )

  const filteredRecords = useMemo(() => {
    const term = normalizeText(search)

    if (!term) return records

    return records.filter((record) =>
      Object.values(record).some((value) =>
        normalizeText(
          typeof value === 'object'
            ? JSON.stringify(value)
            : value,
        ).includes(term),
      ),
    )
  }, [records, search])

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{titulo}</h2>
          <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
        </div>

        <button
          type="button"
          onClick={loadRecords}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin' : ''}
          />
          Actualizar
        </button>
      </div>

      <div className="border-b border-slate-100 p-5">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar en los registros..."
            aria-label={`Buscar en ${titulo}`}
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div>
            <p className="text-sm font-semibold text-red-700">
              No se pudo obtener la información
            </p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
            <p className="mt-2 text-xs text-red-500">
              Comprueba la conexión y vuelve a actualizar los registros.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">
          Cargando información...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-sm text-slate-400">
          Intenta actualizar cuando la información esté disponible.
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center">
          <Table2 size={34} className="mx-auto mb-3 text-slate-300" />

          <p className="font-medium text-slate-600">
            {records.length === 0
              ? 'No hay registros disponibles'
              : 'No se encontraron resultados'}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {records.length === 0
              ? 'Los registros aparecerán cuando existan datos.'
              : 'Prueba con otro término de búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap px-5 py-4 font-semibold"
                  >
                    {formatColumnName(column)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record, index) => (
                <tr
                  key={
                    record.id_movimiento ??
                    record.id_lote ??
                    record.id_producto ??
                    index
                  }
                  className="transition hover:bg-slate-50"
                >
                  {columns.map((column) => (
                    <td
                      key={column}
                      className="whitespace-nowrap px-5 py-4 text-slate-600"
                    >
                      {column === 'estado' && record[column] ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(record[column])}`}
                        >
                          {formatValue(column, record[column])}
                        </span>
                      ) : (
                        formatValue(column, record[column])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
        Mostrando {filteredRecords.length} de {records.length} registros
      </div>
    </section>
  )
}
