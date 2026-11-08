import { useEffect, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { getErrorMessage, getFieldErrors } from '../../services/apiErrors'
import {
  createContact,
  getContacts,
  updateContact,
} from '../../services/contactService'

const PAGE_SIZE = 20
const EMPTY_FORM = {
  tipo: 'cliente',
  nombre: '',
  documento: '',
  telefono: '',
}

export default function ContactsPage({ tipo, titulo }) {
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const queryClient = useQueryClient()
  const initialType = isAdmin ? tipo : 'cliente'
  const [selectedType, setSelectedType] = useState(initialType)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, tipo: initialType || 'cliente' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    )
    return () => window.clearTimeout(timer)
  }, [search])

  const effectiveType = isAdmin ? selectedType : 'cliente'
  const params = {
    page,
    page_size: PAGE_SIZE,
    sort: 'nombre',
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(effectiveType ? { tipo: effectiveType } : {}),
  }

  const contactsQuery = useQuery({
    queryKey: ['contactos', params],
    queryFn: () => getContacts(params),
    placeholderData: keepPreviousData,
  })

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? updateContact(id, data) : createContact(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['contactos'] }),
  })

  const contacts = contactsQuery.data?.data ?? []
  const meta = contactsQuery.data?.meta ?? {
    page,
    page_size: PAGE_SIZE,
    total: 0,
    total_pages: 1,
  }
  const singular = form.tipo === 'proveedor' ? 'proveedor' : 'cliente'

  const openCreateModal = () => {
    const defaultType = effectiveType || 'cliente'
    setEditingContact(null)
    setForm({ ...EMPTY_FORM, tipo: isAdmin ? defaultType : 'cliente' })
    setFieldErrors({})
    setFormError('')
    setModalOpen(true)
  }

  const openEditModal = (contact) => {
    setEditingContact(contact)
    setForm({
      tipo: contact.tipo,
      nombre: contact.nombre ?? '',
      documento: contact.documento ?? '',
      telefono: contact.telefono ?? '',
    })
    setFieldErrors({})
    setFormError('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saveMutation.isPending) return
    setModalOpen(false)
    setEditingContact(null)
    setFieldErrors({})
    setFormError('')
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setFormError('')
  }

  const validateForm = () => {
    const errors = {}
    const name = form.nombre.trim()
    const document = form.documento.trim()
    const phone = form.telefono.trim()

    if (name.length < 2 || name.length > 150) {
      errors.nombre = 'El nombre debe tener entre 2 y 150 caracteres'
    }
    if (document && !/^[\p{L}\p{N}]{6,20}$/u.test(document)) {
      errors.documento = 'Usa entre 6 y 20 letras o números, sin espacios'
    }
    if (phone && !/^[\d+()\-\s]{6,20}$/.test(phone)) {
      errors.telefono = 'Usa entre 6 y 20 caracteres: dígitos, +, -, paréntesis o espacios'
    }
    if (!['cliente', 'proveedor'].includes(form.tipo)) {
      errors.tipo = 'Selecciona un tipo válido'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validateForm()) return

    const payload = {
      tipo: isAdmin ? form.tipo : 'cliente',
      nombre: form.nombre.trim(),
      documento: form.documento.trim() || null,
      telefono: form.telefono.trim() || null,
    }

    try {
      await saveMutation.mutateAsync({
        id: editingContact?.id_contacto,
        data: payload,
      })
      closeModal()
    } catch (requestError) {
      const code = requestError.response?.data?.error?.code
      const apiFields = getFieldErrors(requestError)

      if (code === 'DUPLICADO') {
        setFieldErrors((current) => ({
          ...current,
          documento:
            apiFields.documento ?? 'El documento ya está registrado',
        }))
      } else if (code === 'VALIDACION') {
        setFieldErrors(apiFields)
        if (Object.keys(apiFields).length === 0) {
          setFormError(getErrorMessage(requestError))
        }
      } else {
        setFormError(getErrorMessage(requestError))
      }
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra la información de contactos registrados.
          </p>
        </div>
        <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">
          <Plus size={18} />
          Nuevo {effectiveType === 'proveedor' ? 'proveedor' : 'cliente'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard label="Total de registros" value={meta.total} icon={<Users size={23} />} color="teal" />
        <SummaryCard label="Registros en esta página" value={contacts.length} icon={<Search size={23} />} color="blue" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">Listado de contactos</h2>
            <p className="mt-1 text-xs text-slate-500">Información registrada en el sistema.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Search size={17} className="shrink-0 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Nombre, documento o teléfono..."
                className="w-full min-w-0 text-sm outline-none sm:w-56"
              />
              {search && (
                <button type="button" onClick={() => { setSearch(''); setPage(1) }} aria-label="Limpiar búsqueda" className="text-slate-400 hover:text-slate-700">
                  <X size={15} />
                </button>
              )}
            </div>

            {isAdmin && (
              <select
                value={selectedType}
                onChange={(event) => {
                  setSelectedType(event.target.value)
                  setPage(1)
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
              >
                <option value="">Todos los tipos</option>
                <option value="cliente">Clientes</option>
                <option value="proveedor">Proveedores</option>
              </select>
            )}

            <button type="button" onClick={() => contactsQuery.refetch()} disabled={contactsQuery.isFetching} title="Actualizar listado" aria-label="Actualizar listado" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw size={18} className={contactsQuery.isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {contactsQuery.isError && (
          <div className="m-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {getErrorMessage(contactsQuery.error)}
          </div>
        )}

        {contactsQuery.isPending ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-slate-500">
            <LoaderCircle size={28} className="animate-spin text-teal-600" />
            <p className="text-sm">Cargando registros...</p>
          </div>
        ) : !contactsQuery.isError && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-175 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Nombre</th>
                  {isAdmin && <th className="px-5 py-4 font-semibold">Tipo</th>}
                  <th className="px-5 py-4 font-semibold">Documento</th>
                  <th className="px-5 py-4 font-semibold">Teléfono</th>
                  {isAdmin && <th className="px-5 py-4 text-right font-semibold">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((contact) => (
                  <tr key={contact.id_contacto} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-800">{contact.nombre}</td>
                    {isAdmin && (
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{contact.tipo}</span>
                      </td>
                    )}
                    <td className="px-5 py-4 text-slate-600">{contact.documento || 'No registrado'}</td>
                    <td className="px-5 py-4 text-slate-600">{contact.telefono || 'No registrado'}</td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right">
                        <button type="button" onClick={() => openEditModal(contact)} title="Editar contacto" aria-label={`Editar ${contact.nombre}`} className="rounded-lg p-2 text-teal-700 hover:bg-teal-50">
                          <Pencil size={17} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 3} className="px-5 py-12 text-center">
                      <Users size={30} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-medium text-slate-600">No se encontraron registros</p>
                      <p className="mt-1 text-xs text-slate-400">Prueba con otro término o filtro.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span>Mostrando {contacts.length} de {meta.total} contactos</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={meta.page <= 1 || contactsQuery.isFetching} aria-label="Página anterior" className="rounded-lg border border-slate-200 p-2 disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            <span>Página {meta.page} de {meta.total_pages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(meta.total_pages, current + 1))} disabled={meta.page >= meta.total_pages || contactsQuery.isFetching} aria-label="Página siguiente" className="rounded-lg border border-slate-200 p-2 disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ContactModal
          isAdmin={isAdmin}
          editing={Boolean(editingContact)}
          singular={singular}
          form={form}
          fieldErrors={fieldErrors}
          error={formError}
          saving={saveMutation.isPending}
          onChange={updateField}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  )
}

function SummaryCard({ label, value, icon, color }) {
  const colors = color === 'blue'
    ? 'bg-blue-50 text-blue-700'
    : 'bg-teal-50 text-teal-700'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${colors}`}>{icon}</div>
      </div>
    </div>
  )
}

function ContactModal({
  isAdmin,
  editing,
  singular,
  form,
  fieldErrors,
  error,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="contact-modal-title" className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 id="contact-modal-title" className="text-lg font-bold text-slate-800">
              {editing ? `Editar ${singular}` : `Nuevo ${singular}`}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Completa los datos del contacto.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar formulario" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-5 p-5">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isAdmin && (
            <FormField label="Tipo" error={fieldErrors.tipo}>
              <select value={form.tipo} onChange={(event) => onChange('tipo', event.target.value)} disabled={saving} className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-500">
                <option value="cliente">Cliente</option>
                <option value="proveedor">Proveedor</option>
              </select>
            </FormField>
          )}

          <FormField label="Nombre o razón social *" error={fieldErrors.nombre} icon={<Users size={17} />}>
            <input value={form.nombre} onChange={(event) => onChange('nombre', event.target.value)} disabled={saving} maxLength={150} placeholder="Ingresa el nombre" className="w-full py-3 text-sm outline-none" />
          </FormField>

          <FormField label="Documento de identidad" error={fieldErrors.documento} icon={<FileText size={17} />} hint="Entre 6 y 20 letras o números, sin espacios. No puede repetirse.">
            <input value={form.documento} onChange={(event) => onChange('documento', event.target.value)} disabled={saving} maxLength={20} placeholder="DNI, RUC u otro documento" className="w-full py-3 text-sm outline-none" />
          </FormField>

          <FormField label="Teléfono" error={fieldErrors.telefono} icon={<Phone size={17} />} hint="Entre 6 y 20 caracteres: dígitos, +, -, paréntesis o espacios.">
            <input type="tel" value={form.telefono} onChange={(event) => onChange('telefono', event.target.value)} disabled={saving} maxLength={20} placeholder="Ingresa el teléfono" className="w-full py-3 text-sm outline-none" />
          </FormField>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {saving && <LoaderCircle size={17} className="animate-spin" />}
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormField({ label, error, hint, icon, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {icon ? (
        <div className={`flex items-center gap-2 rounded-lg border px-3 focus-within:border-teal-500 ${error ? 'border-red-400' : 'border-slate-200'}`}>
          <span className="text-slate-400">{icon}</span>
          {children}
        </div>
      ) : children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}
