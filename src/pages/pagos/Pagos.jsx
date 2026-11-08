import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react'

import {
  createPayment,
  getPaymentData,
} from '../../services/paymentService'

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
  { value: 'deposito', label: 'Depósito bancario' },
  { value: 'otro', label: 'Otro' },
]

const currency = (value) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return 'No registrada'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const paymentLabel = (value) =>
  PAYMENT_METHODS.find((method) => method.value === value)?.label ??
  String(value ?? 'No especificado')

export default function Pagos() {
  const [operations, setOperations] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [methodFilter, setMethodFilter] = useState('todos')
  const [operationId, setOperationId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('efectivo')
  const [observation, setObservation] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getPaymentData()
      setOperations(data.operations)
      setPayments(data.payments)
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudo cargar la información de pagos.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    getPaymentData()
      .then((data) => {
        if (!active) return
        setOperations(data.operations)
        setPayments(data.payments)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err.response?.data?.error ||
            err.message ||
            'No se pudo cargar la información de pagos.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
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

  const pendingOperations = useMemo(
    () =>
      operations.filter(
        (operation) =>
          Number(operation.saldo_pendiente) > 0 &&
          ['venta', 'compra'].includes(operation.tipo),
      ),
    [operations],
  )

  const totalCollections = payments
    .filter((payment) => payment.tipo === 'cobro')
    .reduce((sum, payment) => sum + Number(payment.importe), 0)

  const totalDisbursements = payments
    .filter((payment) => payment.tipo === 'pago')
    .reduce((sum, payment) => sum + Number(payment.importe), 0)

  const totalPending = operations.reduce(
    (sum, operation) => sum + Number(operation.saldo_pendiente ?? 0),
    0,
  )

  const paymentMethods = useMemo(
    () => [...new Set(payments.map((payment) => payment.metodo_pago))],
    [payments],
  )

  const filteredPayments = useMemo(() => {
    const term = normalizeText(search)

    return payments.filter((payment) => {
      const matchesType =
        typeFilter === 'todos' || payment.tipo_operacion === typeFilter

      const matchesMethod =
        methodFilter === 'todos' || payment.metodo_pago === methodFilter

      const matchesSearch =
        !term ||
        [
          payment.id_pago,
          payment.id_operacion,
          payment.nombre_contacto,
          payment.tipo,
          payment.tipo_operacion,
          payment.metodo_pago,
          payment.importe,
          payment.observacion,
        ].some((value) => normalizeText(value).includes(term))

      return matchesType && matchesMethod && matchesSearch
    })
  }, [payments, search, typeFilter, methodFilter])

  const handleOperationChange = (value) => {
    setOperationId(value)
    setAmount('')
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (saving) return

    setError('')
    setSuccess('')

    if (!selectedOperation) {
      setError('Selecciona una operación pendiente.')
      return
    }

    const parsedAmount = Number(amount)

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresa un importe válido mayor que cero.')
      return
    }

    if (parsedAmount > Number(selectedOperation.saldo_pendiente)) {
      setError(
        `El importe supera el saldo pendiente de ${currency(selectedOperation.saldo_pendiente)}.`,
      )
      return
    }

    setSaving(true)

    try {
      const created = await createPayment({
        id_operacion: selectedOperation.id_operacion,
        importe: parsedAmount,
        metodo_pago: method,
        observacion: observation,
      })

      const updated = await getPaymentData()
      setOperations(updated.operations)
      setPayments(updated.payments)
      setAmount('')
      setObservation('')
      setOperationId('')

      setSuccess(
        `${created.tipo === 'cobro' ? 'Cobro' : 'Pago'} #${created.id_pago} registrado correctamente.`,
      )
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudo registrar el pago.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pagos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona los cobros de clientes y pagos a proveedores.
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Cobros recibidos</p>
              <p className="mt-2 text-xl font-bold text-slate-800">
                {currency(totalCollections)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <ArrowDownLeft size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pagos realizados</p>
              <p className="mt-2 text-xl font-bold text-slate-800">
                {currency(totalDisbursements)}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <ArrowUpRight size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Saldos pendientes</p>
              <p className="mt-2 text-xl font-bold text-slate-800">
                {currency(totalPending)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <Wallet size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Operaciones pendientes</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {pendingOperations.length}
              </p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
              <CreditCard size={23} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
            <CreditCard size={21} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">
              Registrar cobro o pago
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Registra un abono relacionado con una compra o venta.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="payment-operation"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Operación pendiente *
              </label>
              <select
                id="payment-operation"
                value={operationId}
                onChange={(event) => handleOperationChange(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500"
              >
                <option value="">Seleccionar operación</option>
                {pendingOperations.map((operation) => (
                  <option
                    key={operation.id_operacion}
                    value={operation.id_operacion}
                  >
                    {operation.tipo === 'venta' ? 'Cobro' : 'Pago'} #{operation.id_operacion}
                    {' — '}
                    {operation.nombre_contacto || 'Contacto general'}
                    {' — '}
                    Pendiente: {currency(operation.saldo_pendiente)}
                  </option>
                ))}
              </select>
              {pendingOperations.length === 0 && (
                <p className="mt-1.5 text-xs text-slate-500">
                  No hay operaciones con saldo pendiente.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="payment-amount"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Importe del abono *
              </label>
              <input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={selectedOperation?.saldo_pendiente ?? undefined}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
              />
              {selectedOperation && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Saldo pendiente: {currency(selectedOperation.saldo_pendiente)}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="payment-method"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Método de pago *
              </label>
              <select
                id="payment-method"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500"
              >
                {PAYMENT_METHODS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="payment-observation"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Observación
              </label>
              <input
                id="payment-observation"
                type="text"
                maxLength={250}
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                placeholder="Referencia o detalle opcional"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {selectedOperation && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-slate-50 p-3 text-sm">
              <span className="text-slate-600">
                Total: <strong className="text-slate-800">{currency(selectedOperation.total)}</strong>
              </span>
              <span className="text-slate-600">
                Pagado: <strong className="text-emerald-700">{currency(selectedOperation.total_pagado)}</strong>
              </span>
              <span className="text-slate-600">
                Pendiente: <strong className="text-amber-700">{currency(selectedOperation.saldo_pendiente)}</strong>
              </span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || loading || pendingOperations.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <LoaderCircle size={17} className="animate-spin" />}
              {saving ? 'Registrando...' : 'Registrar abono'}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
              <ClipboardList size={21} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Historial de pagos y abonos</h2>
              <p className="mt-1 text-xs text-slate-500">
                Cada registro representa un movimiento de dinero independiente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Search size={17} className="text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar pago, operación o contacto..."
                className="w-full min-w-0 text-sm outline-none"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
            >
              <option value="todos">Compras y ventas</option>
              <option value="venta">Cobros de ventas</option>
              <option value="compra">Pagos de compras</option>
            </select>

            <select
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
            >
              <option value="todos">Todos los métodos</option>
              {paymentMethods.map((item) => (
                <option key={item} value={item}>
                  {paymentLabel(item)}
                </option>
              ))}
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
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Pago</th>
                  <th className="px-5 py-4 font-semibold">Tipo</th>
                  <th className="px-5 py-4 font-semibold">Operación</th>
                  <th className="px-5 py-4 font-semibold">Contacto</th>
                  <th className="px-5 py-4 font-semibold">Fecha</th>
                  <th className="px-5 py-4 font-semibold">Método</th>
                  <th className="px-5 py-4 text-right font-semibold">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id_pago} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-800">
                      #{payment.id_pago}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        payment.tipo === 'cobro'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {payment.tipo === 'cobro' ? 'Cobro' : 'Pago'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      #{payment.id_operacion}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {payment.nombre_contacto || 'Contacto general'}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(payment.fecha)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {paymentLabel(payment.metodo_pago)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">
                      {currency(payment.importe)}
                    </td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <ClipboardList size={30} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-medium text-slate-600">
                        No se encontraron pagos
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Registra un abono o modifica los filtros de búsqueda.
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
        Los estados financieros se calculan a partir de los abonos registrados.
        El estado comercial de las compras y ventas se conserva por separado.
      </p>
    </section>
  )
}
