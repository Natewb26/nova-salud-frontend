import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '../../services/apiErrors'

export default function StockAdjustmentModal({ lot, onClose, onSubmit }) {
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const errors = {}

    if (!/^-?\d+$/.test(cantidad) || Number(cantidad) === 0) {
      errors.cantidad = 'Ingresa un entero distinto de cero'
    }
    if (!motivo.trim()) errors.motivo = 'El motivo es obligatorio'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    setError('')

    try {
      await onSubmit({ cantidad: Number(cantidad), motivo: motivo.trim() })
      onClose()
    } catch (requestError) {
      const apiFields = getFieldErrors(requestError)
      setFieldErrors(apiFields)
      setError(
        Object.keys(apiFields).length > 0 ? '' : getErrorMessage(requestError),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ajustar stock</h2>
            <p className="mt-1 text-sm text-slate-500">
              Lote {lot.codigo_lote ?? `#${lot.id_lote}`}. Usa una cantidad negativa para descontar.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad del ajuste</label>
            <input
              type="number"
              step="1"
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
            />
            {fieldErrors.cantidad && <p className="mt-1 text-xs text-red-600">{fieldErrors.cantidad}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              disabled={submitting}
              rows="3"
              maxLength="300"
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
            />
            {fieldErrors.motivo && <p className="mt-1 text-xs text-red-600">{fieldErrors.motivo}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {submitting && <Loader2 size={17} className="animate-spin" />}
              Guardar ajuste
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
