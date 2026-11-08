import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '../../services/apiErrors'

const getCategoryValue = (product) =>
  product?.id_categoria ??
  product?.categoria?.id_categoria ??
  product?.categoria?.id ??
  product?.categoria?.nombre ??
  product?.categoria ??
  ''

const getInitialForm = (product) => ({
  nombre: product?.nombre ?? '',
  codigo_barras: product?.codigo_barras ?? '',
  categoria: String(getCategoryValue(product)),
  principio_activo: product?.principio_activo ?? '',
  presentacion: product?.presentacion ?? '',
  precio_venta: product?.precio_venta != null
    ? String(product.precio_venta)
    : '',
  stock_minimo: product?.stock_minimo != null
    ? String(product.stock_minimo)
    : '',
})

const categoryId = (category) =>
  category.id_categoria ?? category.id ?? category.nombre

const categoryName = (category) =>
  category.nombre ?? category.name ?? String(category)

export default function ProductFormModal({
  product,
  categories,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => getInitialForm(product))
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const editing = Boolean(product)

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({
      ...current,
      [field]: '',
      ...(field === 'categoria' ? { id_categoria: '' } : {}),
    }))
    setError('')
  }

  const validate = () => {
    const errors = {}
    const pricePattern = /^\d+(?:\.\d{1,2})?$/

    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio'
    if (!form.codigo_barras.trim()) {
      errors.codigo_barras = 'El código de barras es obligatorio'
    }
    if (!form.categoria) errors.id_categoria = 'Selecciona una categoría'
    if (!form.principio_activo.trim()) {
      errors.principio_activo = 'El principio activo es obligatorio'
    }
    if (!form.presentacion.trim()) {
      errors.presentacion = 'La presentación es obligatoria'
    }
    if (!pricePattern.test(form.precio_venta) || Number(form.precio_venta) <= 0) {
      errors.precio_venta = 'Ingresa un precio válido con máximo 2 decimales'
    }
    if (
      !/^\d+$/.test(form.stock_minimo) ||
      Number(form.stock_minimo) < 0
    ) {
      errors.stock_minimo = 'El stock mínimo debe ser un entero positivo o cero'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!validate()) return

    const selectedCategory = categories.find(
      (category) => String(categoryId(category)) === form.categoria,
    )
    const payload = {
      nombre: form.nombre.trim(),
      codigo_barras: form.codigo_barras.trim(),
      principio_activo: form.principio_activo.trim(),
      presentacion: form.presentacion.trim(),
      precio_venta: Number(form.precio_venta),
      stock_minimo: Number(form.stock_minimo),
      ...(selectedCategory?.id_categoria != null || selectedCategory?.id != null
        ? { id_categoria: selectedCategory.id_categoria ?? selectedCategory.id }
        : { categoria: categoryName(selectedCategory ?? form.categoria) }),
    }

    setSubmitting(true)

    try {
      await onSubmit(payload)
      onClose()
    } catch (requestError) {
      const code = requestError.response?.data?.error?.code
      const apiFields = getFieldErrors(requestError)

      if (code === 'DUPLICADO') {
        setFieldErrors((current) => ({
          ...current,
          codigo_barras:
            apiFields.codigo_barras ??
            'Ya existe un producto con ese código de barras',
        }))
      } else if (code === 'VALIDACION') {
        setFieldErrors(apiFields)
        if (Object.keys(apiFields).length === 0) {
          setError(getErrorMessage(requestError))
        }
      } else {
        setError(getErrorMessage(requestError))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const fields = [
    { name: 'nombre', label: 'Nombre', placeholder: 'Paracetamol 500 mg' },
    { name: 'codigo_barras', label: 'Código de barras', placeholder: '775000000001' },
    { name: 'principio_activo', label: 'Principio activo', placeholder: 'Paracetamol' },
    { name: 'presentacion', label: 'Presentación', placeholder: 'Caja x 100 tabletas' },
  ]

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {editing ? 'Editar producto' : 'Registrar producto'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Completa los datos del catálogo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Cerrar formulario"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {field.label}
                </label>
                <input
                  value={form[field.name]}
                  onChange={(event) => updateField(field.name, event.target.value)}
                  disabled={submitting}
                  placeholder={field.placeholder}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-teal-500 ${
                    fieldErrors[field.name] ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                {fieldErrors[field.name] && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors[field.name]}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Categoría
              </label>
              <select
                value={form.categoria}
                onChange={(event) => updateField('categoria', event.target.value)}
                disabled={submitting}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-teal-500 ${
                  fieldErrors.id_categoria || fieldErrors.categoria
                    ? 'border-red-400'
                    : 'border-slate-200'
                }`}
              >
                <option value="">Selecciona una categoría</option>
                {categories.map((category) => (
                  <option key={categoryId(category)} value={categoryId(category)}>
                    {categoryName(category)}
                  </option>
                ))}
              </select>
              {(fieldErrors.id_categoria || fieldErrors.categoria) && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.id_categoria || fieldErrors.categoria}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Precio de venta
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.precio_venta}
                onChange={(event) => updateField('precio_venta', event.target.value)}
                disabled={submitting}
                placeholder="10.50"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-teal-500 ${
                  fieldErrors.precio_venta ? 'border-red-400' : 'border-slate-200'
                }`}
              />
              {fieldErrors.precio_venta && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.precio_venta}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Stock mínimo
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock_minimo}
                onChange={(event) => updateField('stock_minimo', event.target.value)}
                disabled={submitting}
                placeholder="10"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-teal-500 ${
                  fieldErrors.stock_minimo ? 'border-red-400' : 'border-slate-200'
                }`}
              />
              {fieldErrors.stock_minimo && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.stock_minimo}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={17} className="animate-spin" />}
              {editing ? 'Guardar cambios' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
