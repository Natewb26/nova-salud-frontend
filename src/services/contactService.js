import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import {
  getDemoState,
  updateDemoState,
  getNextDemoId,
} from './demoStore'

const normalizeDocument = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()

const validateContact = (contact) => {
  if (!contact.nombre?.trim()) {
    throw new Error('El nombre del contacto es obligatorio.')
  }

  if (!['cliente', 'proveedor'].includes(contact.tipo)) {
    throw new Error('El tipo de contacto no es válido.')
  }
}

export const getContacts = async (tipo) => {
  if (DEMO_DATA_MODE) {
    return getDemoState().contacts
      .filter((contact) => contact.tipo === tipo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }

  const response = await api.get('/api/contactos')

  return response.data.filter((contact) => contact.tipo === tipo)
}

export const createContact = async (contact) => {
  if (DEMO_DATA_MODE) {
    validateContact(contact)

    const state = getDemoState()
    const documento = String(contact.documento ?? '').trim()
    const normalizedDocument = normalizeDocument(documento)

    if (
      normalizedDocument &&
      state.contacts.some(
        (item) =>
          normalizeDocument(item.documento) === normalizedDocument,
      )
    ) {
      throw new Error('Ya existe un contacto con ese documento.')
    }

    let created

    updateDemoState((current) => {
      const id = getNextDemoId(current.contacts, 'id_contacto')

      created = {
        ...contact,
        id_contacto: id,
        nombre: contact.nombre.trim(),
        documento: documento || null,
        telefono: String(contact.telefono ?? '').trim() || null,
      }

      return {
        ...current,
        contacts: [...current.contacts, created],
      }
    })

    return created
  }

  const response = await api.post('/api/contactos', contact)
  return response.data
}

export const updateContact = async (id, contact) => {
  if (DEMO_DATA_MODE) {
    validateContact(contact)

    const state = getDemoState()
    const documento = String(contact.documento ?? '').trim()
    const normalizedDocument = normalizeDocument(documento)

    if (
      normalizedDocument &&
      state.contacts.some(
        (item) =>
          item.id_contacto !== Number(id) &&
          normalizeDocument(item.documento) === normalizedDocument,
      )
    ) {
      throw new Error('Otro contacto ya utiliza ese documento.')
    }

    let updated

    updateDemoState((current) => ({
      ...current,
      contacts: current.contacts.map((item) => {
        if (item.id_contacto !== Number(id)) return item

        updated = {
          ...item,
          ...contact,
          nombre: contact.nombre.trim(),
          documento: documento || null,
          telefono: String(contact.telefono ?? '').trim() || null,
        }

        return updated
      }),
    }))

    if (!updated) {
      throw new Error('No se encontró el contacto.')
    }

    return updated
  }

  const response = await api.patch(`/api/contactos/${id}`, contact)
  return response.data
}
