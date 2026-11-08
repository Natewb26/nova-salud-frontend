
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ClipboardList,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Undo2,
} from 'lucide-react'

import {
  createReturn,
  getReturnData,
} from '../../services/returnService'

const currency = (value) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0)

const formatDate = (value) => {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : date.toLocaleString('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
}

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const itemKey = (item) =>
  `${item.id_producto}-${item.codigo_lote ?? 'general'}`

export default function Devoluciones() {
  const [operations, setOperations] = useState([])
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [operationId, setOperationId] = useState('')
  const [quantities, setQuantities] = useState({})
  const [conditions, setConditions] = useState({})
  const [batchCodes, setBatchCodes] = useState({})
  const [expiryDates, setExpiryDates] = useState({})
  const [reason, setReason] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getReturnData()
      setOperations(data.operations)
      setReturns(data.returns)
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudo cargar la información de devoluciones.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      try {
        const data = await getReturnData()

        if (!cancelled) {
          setOperations(data.operations)
          setReturns(data.returns)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              err.message ||
              'No se pudo cargar la información de devoluciones.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedOperation = useMemo(
    () =>
      operations.find(
        (operation) =>
          Number(operation.id_operacion) === Number(operationId),
      ),
    [operations, operationId],
  )

  const isSaleReturn = selectedOperation?.tipo === 'venta'

  const selectedItems = useMemo(
    () =>
      (selectedOperation?.items ?? []).filter(
        (item) => Number(quantities[itemKey(item)] ?? 0) > 0,
      ),
    [selectedOperation, quantities],
  )

  const estimatedTotal = selectedItems.reduce(
    (sum, item) =>
      sum +
      Number(quantities[itemKey(item)]) *
        Number(item.precio_unitario ?? 0),
    0,
  )

  const filteredReturns = useMemo(() => {
    const term = normalizeText(search)

    return returns.filter((entry) => {
      const matchesType =
        typeFilter === 'todos' || entry.tipo_operacion === typeFilter

      const matchesSearch =
        !term ||
        [
          entry.id_devolucion,
          entry.id_operacion,
          entry.nombre_contacto,
          entry.motivo,
          ...entry.items.map((item) => item.nombre),
        ].some((value) => normalizeText(value).includes(term))

      return matchesType && matchesSearch
    })
  }, [returns, search, typeFilter])

  const handleOperationChange = (value) => {
    setOperationId(value)
    setQuantities({})
    setConditions({})
    setBatchCodes({})
    setExpiryDates({})
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (saving) return

    setError('')
    setSuccess('')

    if (!selectedOperation) {
      setError('Selecciona la operación original.')
      return
    }

    if (selectedItems.length === 0) {
      setError('Indica la cantidad de al menos un producto.')
      return
    }

    if (reason.trim().length < 3) {
      setError('Describe el motivo de la devolución.')
      return
    }

    const items = selectedItems.map((item) => {
      const key = itemKey(item)
      const entry = {
        id_producto: item.id_producto,
        cantidad: Number(quantities[key]),
      }

      if (selectedOperation.tipo === 'compra') {
        entry.codigo_lote = item.codigo_lote
      } else {
        entry.condicion = conditions[key] ?? 'reintegrar'
        entry.codigo_lote = batchCodes[key] ?? ''
        entry.fecha_vencimiento = expiryDates[key] ?? ''
      }

      return entry
    })

    setSaving(true)

    try {
      const created = await createReturn({
        id_operacion: selectedOperation.id_operacion,
        motivo: reason,
        items,
      })

      const data = await getReturnData()

      setOperations(data.operations)
      setReturns(data.returns)
      setOperationId('')
      setQuantities({})
      setConditions({})
      setBatchCodes({})
      setExpiryDates({})
      setReason('')

      setSuccess(
        `Devolución #${created.id_devolucion} registrada correctamente. Valor referencial: ${currency(created.total_estimado)}.`,
      )
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudo registrar la devolución.',
      )
    } finally {
      setSaving(false)
    }
  }

  const returnedUnits = returns.reduce(
    (sum, entry) =>
      sum +
      entry.items.reduce(
        (itemSum, item) => itemSum + Number(item.cantidad),
        0,
      ),
    0,
  )

  const salesReturns = returns.filter(
    (entry) => entry.tipo_operacion === 'venta',
  ).length

  const purchaseReturns = returns.filter(
    (entry) => entry.tipo_operacion === 'compra',
  ).length

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Devoluciones
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona devoluciones de clientes y devoluciones a proveedores.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading || saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          Actualizar información
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Devoluciones registradas</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">
            {returns.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Devoluciones de ventas</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">
            {salesReturns}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Devoluciones a proveedores</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">
            {purchaseReturns}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Unidades devueltas</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">
            {returnedUnits}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
            <RotateCcw size={21} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">
              Registrar devolución
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona una operación original y las cantidades que deseas devolver.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-8 text-sm text-slate-500">
            <LoaderCircle size={22} className="animate-spin text-teal-600" />
            Cargando operaciones...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="return-operation"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Compra o venta original *
              </label>
              <select
                id="return-operation"
                value={operationId}
                onChange={(event) => handleOperationChange(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500"
              >
                <option value="">Seleccionar operación</option>
                {operations.map((operation) => (
                  <option
                    key={operation.id_operacion}
                    value={operation.id_operacion}
                  >
                    {operation.tipo === 'venta' ? 'Venta' : 'Compra'} #
                    {operation.id_operacion} - {operation.nombre_contacto || 'Contacto general'}
                    {' - '}
                    {currency(operation.total)}
                  </option>
                ))}
              </select>

              {operations.length === 0 && (
                <p className="mt-1.5 text-xs text-slate-500">
                  No hay operaciones con cantidades disponibles para devolver.
                </p>
              )}
            </div>

            {selectedOperation && (
              <>
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span>
                    Tipo: <strong className="text-slate-800">
                      {isSaleReturn ? 'Devolución de venta' : 'Devolución a proveedor'}
                    </strong>
                  </span>
                  <span className="ml-5">
                    Fecha original: <strong className="text-slate-800">
                      {formatDate(selectedOperation.fecha)}
                    </strong>
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Productos de la operación
                  </h3>

                  {selectedOperation.items.map((item) => {
                    const key = itemKey(item)
                    const quantity = Number(quantities[key] ?? 0)

                    return (
                      <div
                        key={key}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <p className="font-medium text-slate-800">
                              {item.nombre}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Original: {item.cantidad} | Devuelto: {item.cantidad_devuelta} | Disponible: {item.cantidad_disponible}
                            </p>
                            {selectedOperation.tipo === 'compra' && (
                              <p className="mt-1 text-xs text-slate-500">
                                Lote original: {item.codigo_lote || 'No identificado'}
                              </p>
                            )}
                          </div>

                          <div className="w-full sm:w-36">
                            <label
                              htmlFor={`return-quantity-${key}`}
                              className="mb-1 block text-xs font-medium text-slate-600"
                            >
                              Cantidad a devolver
                            </label>
                            <input
                              id={`return-quantity-${key}`}
                              type="number"
                              min="0"
                              max={item.cantidad_disponible}
                              step="1"
                              value={quantities[key] ?? ''}
                              onChange={(event) =>
                                setQuantities((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                            />
                          </div>
                        </div>

                        {isSaleReturn && quantity > 0 && (
                          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-3">
                            <div>
                              <label
                                htmlFor={`return-condition-${key}`}
                                className="mb-1 block text-xs font-medium text-slate-600"
                              >
                                Condición del producto
                              </label>
                              <select
                                id={`return-condition-${key}`}
                                value={conditions[key] ?? 'reintegrar'}
                                onChange={(event) =>
                                  setConditions((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                              >
                                <option value="reintegrar">
                                  Apto para reingreso
                                </option>
                                <option value="danado">
                                  Dañado / No apto
                                </option>
                              </select>
                            </div>

                            {(conditions[key] ?? 'reintegrar') === 'reintegrar' && (
                              <>
                                <div>
                                  <label
                                    htmlFor={`return-batch-${key}`}
                                    className="mb-1 block text-xs font-medium text-slate-600"
                                  >
                                    Código de lote *
                                  </label>
                                  <input
                                    id={`return-batch-${key}`}
                                    value={batchCodes[key] ?? ''}
                                    onChange={(event) =>
                                      setBatchCodes((current) => ({
                                        ...current,
                                        [key]: event.target.value,
                                      }))
                                    }
                                    required
                                    maxLength={80}
                                    placeholder="Según el empaque"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                                  />
                                </div>

                                <div>
                                  <label
                                    htmlFor={`return-expiry-${key}`}
                                    className="mb-1 block text-xs font-medium text-slate-600"
                                  >
                                    Vencimiento *
                                  </label>
                                  <input
                                    id={`return-expiry-${key}`}
                                    type="date"
                                    value={expiryDates[key] ?? ''}
                                    onChange={(event) =>
                                      setExpiryDates((current) => ({
                                        ...current,
                                        [key]: event.target.value,
                                      }))
                                    }
                                    required
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="return-reason"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Motivo de devolución *
              </label>
              <textarea
                id="return-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                minLength={3}
                maxLength={250}
                rows={3}
                placeholder="Describe el motivo de la devolución..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
              />
            </div>

            {selectedItems.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-4">
                <div className="text-sm text-slate-600">
                  Productos seleccionados: <strong>{selectedItems.length}</strong>
                </div>
                <div className="text-sm text-slate-600">
                  Valor referencial: <strong className="text-slate-800">
                    {currency(estimatedTotal)}
                  </strong>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || loading || !selectedOperation}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Undo2 size={17} />
                )}
                {saving ? 'Registrando...' : 'Registrar devolución'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
              <ClipboardList size={21} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">
                Historial de devoluciones
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Consulta las devoluciones registradas y sus operaciones originales.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Search size={17} className="text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar devolución, producto o contacto..."
                className="w-full min-w-0 text-sm outline-none"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
            >
              <option value="todos">Todas las devoluciones</option>
              <option value="venta">Devoluciones de ventas</option>
              <option value="compra">Devoluciones a proveedores</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
            <LoaderCircle size={22} className="animate-spin text-teal-600" />
            Cargando historial...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Devolución</th>
                  <th className="px-5 py-4 font-semibold">Tipo</th>
                  <th className="px-5 py-4 font-semibold">Operación</th>
                  <th className="px-5 py-4 font-semibold">Contacto</th>
                  <th className="px-5 py-4 font-semibold">Productos</th>
                  <th className="px-5 py-4 font-semibold">Fecha</th>
                  <th className="px-5 py-4 text-right font-semibold">Valor referencial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.map((entry) => (
                  <tr key={entry.id_devolucion} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-800">
                      #{entry.id_devolucion}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        entry.tipo_operacion === 'venta'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {entry.tipo_operacion === 'venta' ? 'Venta' : 'Compra'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      #{entry.id_operacion}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {entry.nombre_contacto || 'Contacto general'}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {entry.items.reduce(
                        (sum, item) => sum + Number(item.cantidad),
                        0,
                      )} unidades
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(entry.fecha)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">
                      {currency(entry.total_estimado)}
                    </td>
                  </tr>
                ))}

                {filteredReturns.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <ClipboardList size={30} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-medium text-slate-600">
                        No se encontraron devoluciones
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Registra una devolución o modifica los filtros.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        El valor de devolución es referencial. El registro no genera automáticamente
        reembolsos, notas de crédito ni modificaciones en los pagos originales.
      </p>
    </section>
  )
}
