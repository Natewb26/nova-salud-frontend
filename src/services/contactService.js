import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import {
  getDemoState,
  getNextDemoId,
  updateDemoState,
} from './demoStore'

const normalizeDocument = (value) =>
  String(value ?? '').trim().toLocaleLowerCase('es')

const createDemoApiError = (code, message, details = []) => {
  const error = new Error(message)
  error.response = {
    status: code === 'DUPLICADO' ? 409 : 422,
    data: { error: { code, message, details } },
  }
  return error
}

const validateContact = (contact) => {
  const details = []

  if (!contact.nombre?.trim()) {
    details.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio' })
  }
  if (!['cliente', 'proveedor'].includes(contact.tipo)) {
    details.push({ campo: 'tipo', mensaje: 'Selecciona un tipo válido' })
  }
  if (
    contact.documento &&
    !/^[\p{L}\p{N}]{6,20}$/u.test(contact.documento)
  ) {
    details.push({
      campo: 'documento',
      mensaje: 'Usa entre 6 y 20 letras o números, sin espacios',
    })
  }
  if (
    contact.telefono &&
    !/^[\d+()\-\s]{6,20}$/.test(contact.telefono)
  ) {
    details.push({
      campo: 'telefono',
      mensaje: 'Usa entre 6 y 20 caracteres: dígitos, +, -, paréntesis o espacios',
    })
  }

  if (details.length > 0) {
    throw createDemoApiError('VALIDACION', 'Revisa los datos ingresados', details)
  }
}

const ensureUniqueDocument = (contacts, document, excludedId) => {
  if (!document) return

  const duplicate = contacts.some(
    (contact) =>
      Number(contact.id_contacto) !== Number(excludedId) &&
      normalizeDocument(contact.documento) === normalizeDocument(document),
  )

  if (duplicate) {
    throw createDemoApiError(
      'DUPLICADO',
      'Ya existe un contacto con ese documento',
      [{ campo: 'documento', mensaje: 'El documento ya está registrado' }],
    )
  }
}

export const getContacts = async (params = {}) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/contactos', { params })
    return {
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      meta: response.data?.meta ?? {
        page: 1,
        page_size: 20,
        total: 0,
        total_pages: 1,
      },
    }
  }

  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 20))
  const search = String(params.search ?? '').trim().toLocaleLowerCase('es')
  let contacts = getDemoState().contacts.slice()

  if (params.tipo) {
    contacts = contacts.filter((contact) => contact.tipo === params.tipo)
  }

  if (search) {
    contacts = contacts.filter((contact) =>
      [contact.nombre, contact.documento, contact.telefono].some((value) =>
        String(value ?? '').toLocaleLowerCase('es').includes(search),
      ),
    )
  }

  contacts.sort((left, right) =>
    String(left.nombre ?? '').localeCompare(String(right.nombre ?? ''), 'es'),
  )

  const total = contacts.length
  const start = (page - 1) * pageSize

  return {
    data: contacts.slice(start, start + pageSize),
    meta: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

export const createContact = async (contact) => {
  const payload = {
    ...contact,
    nombre: contact.nombre.trim(),
    documento: contact.documento?.trim() || null,
    telefono: contact.telefono?.trim() || null,
  }

  if (!DEMO_DATA_MODE) {
    const response = await api.post('/contactos', payload)
    return response.data?.data
  }

  validateContact(payload)
  ensureUniqueDocument(getDemoState().contacts, payload.documento)

  let created

  updateDemoState((current) => {
    created = {
      ...payload,
      id_contacto: getNextDemoId(current.contacts, 'id_contacto'),
    }

    return { ...current, contacts: [...current.contacts, created] }
  })

  return created
}

export const updateContact = async (id, contact) => {
  const payload = {
    ...contact,
    nombre: contact.nombre.trim(),
    documento: contact.documento?.trim() || null,
    telefono: contact.telefono?.trim() || null,
  }

  if (!DEMO_DATA_MODE) {
    const response = await api.patch(`/contactos/${id}`, payload)
    return response.data?.data
  }

  validateContact(payload)
  ensureUniqueDocument(getDemoState().contacts, payload.documento, id)

  let updated = null

  updateDemoState((current) => ({
    ...current,
    contacts: current.contacts.map((item) => {
      if (Number(item.id_contacto) !== Number(id)) return item
      updated = { ...item, ...payload }
      return updated
    }),
  }))

  return updated
}
