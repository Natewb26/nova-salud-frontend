import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  Plus,
  Pencil,
  Users,
  RefreshCw,
  X,
  Phone,
  FileText,
  AlertCircle,
  LoaderCircle,
} from 'lucide-react'

import {
  getContacts,
  createContact,
  updateContact,
} from '../../services/contactService'

const EMPTY_FORM = {
  nombre: '',
  documento: '',
  telefono: '',
}

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export default function ContactsPage({ tipo, titulo }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const singular = tipo === 'cliente' ? 'cliente' : 'proveedor'

  // Cargar los contactos del tipo correspondiente.
  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getContacts(tipo)
      setContacts(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudieron cargar los registros.',
      )
    } finally {
      setLoading(false)
    }
  }, [tipo])

  useEffect(() => {
    let active = true

    getContacts(tipo)
      .then((data) => {
        if (!active) return
        setContacts(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setError(
          err.response?.data?.error ||
            err.message ||
            'No se pudieron cargar los registros.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tipo])

  // Buscar por nombre, documento o teléfono, ignorando tildes.
  const filteredContacts = useMemo(() => {
    const term = normalizeText(search)

    const sorted = [...contacts].sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '', 'es'),
    )

    if (!term) return sorted

    return sorted.filter((contact) =>
      [
        contact.nombre,
        contact.documento,
        contact.telefono,
      ].some((value) => normalizeText(value).includes(term)),
    )
  }, [contacts, search])

  const openCreateModal = () => {
    setEditingContact(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setModalOpen(true)
  }

  const openEditModal = (contact) => {
    setEditingContact(contact)
    setForm({
      nombre: contact.nombre || '',
      documento: contact.documento || '',
      telefono: contact.telefono || '',
    })
    setError('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return

    setModalOpen(false)
    setEditingContact(null)
    setForm({ ...EMPTY_FORM })
    setError('')
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    if (error) setError('')
  }

  // Validar la información antes de guardar.
  const validateForm = () => {
    const nombre = form.nombre.trim()
    const documento = form.documento.trim()
    const telefono = form.telefono.trim()

    if (!nombre) {
      return 'El nombre es obligatorio.'
    }

    if (nombre.length < 2) {
      return 'El nombre debe tener al menos 2 caracteres.'
    }

    if (nombre.length > 150) {
      return 'El nombre no puede superar los 150 caracteres.'
    }

    if (documento && (documento.length < 6 || documento.length > 20)) {
      return 'El documento debe tener entre 6 y 20 caracteres.'
    }

    if (telefono) {
      const normalizedPhone = telefono.replace(/[\s().-]/g, '')

      if (!/^\+?\d{7,15}$/.test(normalizedPhone)) {
        return 'Ingresa un teléfono válido de entre 7 y 15 dígitos.'
      }
    }

    return ''
  }

  // Registrar o actualizar un contacto.
  const handleSubmit = async (event) => {
    event.preventDefault()

    if (saving) return

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setSaving(true)

    const payload = {
      tipo,
      nombre: form.nombre.trim(),
      documento: form.documento.trim() || null,
      telefono: form.telefono.trim() || null,
    }

    try {
      if (editingContact) {
        const updated = await updateContact(
          editingContact.id_contacto,
          payload,
        )

        setContacts((current) =>
          current.map((contact) =>
            contact.id_contacto === updated.id_contacto
              ? updated
              : contact,
          ),
        )
      } else {
        const created = await createContact(payload)

        setContacts((current) =>
          [...current, created].sort((a, b) =>
            (a.nombre || '').localeCompare(b.nombre || '', 'es'),
          ),
        )
      }

      setModalOpen(false)
      setEditingContact(null)
      setForm({ ...EMPTY_FORM })
      setError('')
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudo guardar el registro.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {titulo}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra la información de tus {titulo.toLowerCase()}.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <Plus size={18} />
          Nuevo {singular}
        </button>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Total de registros
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {contacts.length}
              </p>
            </div>

            <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
              <Users size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Resultados de búsqueda
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {filteredContacts.length}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <Search size={23} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">
              Listado de {titulo.toLowerCase()}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Información registrada en el sistema.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:flex-none">
              <Search size={17} className="shrink-0 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar..."
                aria-label={`Buscar ${titulo.toLowerCase()}`}
                className="w-full min-w-0 text-sm outline-none sm:w-48"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Limpiar búsqueda"
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={loadContacts}
              disabled={loading}
              title="Actualizar listado"
              aria-label="Actualizar listado"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={loading ? 'animate-spin' : ''}
              />
            </button>
          </div>
        </div>

        {error && !modalOpen && (
          <div className="m-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Cerrar mensaje"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-slate-500">
            <LoaderCircle
              size={28}
              className="animate-spin text-teal-600"
            />
            <p className="text-sm">Cargando registros...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Nombre</th>
                  <th className="px-5 py-4 font-semibold">Documento</th>
                  <th className="px-5 py-4 font-semibold">Teléfono</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => (
                  <tr
                    key={contact.id_contacto}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {contact.nombre}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {contact.documento || 'No registrado'}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {contact.telefono || 'No registrado'}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => openEditModal(contact)}
                          title="Editar contacto"
                          aria-label={`Editar ${contact.nombre}`}
                          className="rounded-lg p-2 text-teal-700 hover:bg-teal-50"
                        >
                          <Pencil size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredContacts.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-5 py-12 text-center">
                      <Users
                        size={30}
                        className="mx-auto mb-3 text-slate-300"
                      />
                      <p className="font-medium text-slate-600">
                        No se encontraron registros
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {search
                          ? 'Prueba con otro término de búsqueda.'
                          : 'Cuando registres nuevos contactos aparecerán aquí.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de registro y edición */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2
                  id="contact-modal-title"
                  className="text-lg font-bold text-slate-800"
                >
                  {editingContact
                    ? `Editar ${singular}`
                    : `Nuevo ${singular}`}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Completa los datos del {singular}.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Cerrar formulario"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Nombre o razón social *
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-teal-500">
                  <Users size={17} className="text-slate-400" />
                  <input
                    id="contact-name"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                    minLength={2}
                    maxLength={150}
                    autoComplete="organization"
                    placeholder="Ingresa el nombre"
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-document"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Documento de identidad
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-teal-500">
                  <FileText size={17} className="text-slate-400" />
                  <input
                    id="contact-document"
                    name="documento"
                    value={form.documento}
                    onChange={handleChange}
                    maxLength={20}
                    autoComplete="off"
                    placeholder="DNI, RUC u otro documento"
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Campo opcional. No puede repetirse en otro contacto.
                </p>
              </div>

              <div>
                <label
                  htmlFor="contact-phone"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Teléfono
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-teal-500">
                  <Phone size={17} className="text-slate-400" />
                  <input
                    id="contact-phone"
                    name="telefono"
                    type="tel"
                    value={form.telefono}
                    onChange={handleChange}
                    maxLength={20}
                    autoComplete="tel"
                    placeholder="Ingresa el teléfono"
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={17} className="animate-spin" />
                  )}
                  {saving
                    ? 'Guardando...'
                    : editingContact
                      ? 'Guardar cambios'
                      : 'Registrar contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
