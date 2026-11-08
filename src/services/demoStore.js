const STORAGE_KEY = 'nova_salud_demo_db_v1'

const initialState = {
  categories: [
    'Medicamentos',
    'Cuidado personal',
    'Vitaminas',
  ],
  products: [
    {
      id: 1,
      id_producto: 1,
      name: 'Paracetamol 500 mg',
      nombre: 'Paracetamol 500 mg',
      sku: 'MED-001',
      codigo_barras: 'MED-001',
      category: 'Medicamentos',
      categoria: 'Medicamentos',
      price: 5.5,
      precio_venta: 5.5,
      precio_compra: 3.5,
      stock: 120,
      stock_minimo: 10,
      estado: 'activo',
    },
    {
      id: 2,
      id_producto: 2,
      name: 'Ibuprofeno 400 mg',
      nombre: 'Ibuprofeno 400 mg',
      sku: 'MED-002',
      codigo_barras: 'MED-002',
      category: 'Medicamentos',
      categoria: 'Medicamentos',
      price: 8,
      precio_venta: 8,
      precio_compra: 5,
      stock: 4,
      stock_minimo: 10,
      estado: 'activo',
    },
    {
      id: 3,
      id_producto: 3,
      name: 'Alcohol medicinal 70%',
      nombre: 'Alcohol medicinal 70%',
      sku: 'CUI-001',
      codigo_barras: 'CUI-001',
      category: 'Cuidado personal',
      categoria: 'Cuidado personal',
      price: 7.5,
      precio_venta: 7.5,
      precio_compra: 4.5,
      stock: 45,
      stock_minimo: 10,
      estado: 'activo',
    },
    {
      id: 4,
      id_producto: 4,
      name: 'Vitamina C 1 g',
      nombre: 'Vitamina C 1 g',
      sku: 'VIT-001',
      codigo_barras: 'VIT-001',
      category: 'Vitaminas',
      categoria: 'Vitaminas',
      price: 12,
      precio_venta: 12,
      precio_compra: 8,
      stock: 0,
      stock_minimo: 10,
      estado: 'activo',
    },
    {
      id: 5,
      id_producto: 5,
      name: 'Agua oxigenada',
      nombre: 'Agua oxigenada',
      sku: 'CUI-002',
      codigo_barras: 'CUI-002',
      category: 'Cuidado personal',
      categoria: 'Cuidado personal',
      price: 6,
      precio_venta: 6,
      precio_compra: 3.8,
      stock: 32,
      stock_minimo: 10,
      estado: 'activo',
    },
  ],
  contacts: [
    {
      id_contacto: 1,
      tipo: 'proveedor',
      nombre: 'Distribuidora Médica del Perú',
      documento: '20123456781',
      telefono: '987654321',
    },
    {
      id_contacto: 2,
      tipo: 'proveedor',
      nombre: 'Laboratorios Andinos',
      documento: '20234567892',
      telefono: '986123456',
    },
    {
      id_contacto: 3,
      tipo: 'proveedor',
      nombre: 'Comercial Farma Norte',
      documento: '20345678903',
      telefono: '985234567',
    },
    {
      id_contacto: 4,
      tipo: 'cliente',
      nombre: 'María Torres',
      documento: '45678912',
      telefono: '984123456',
    },
    {
      id_contacto: 5,
      tipo: 'cliente',
      nombre: 'José Ramírez',
      documento: '46789123',
      telefono: '983234567',
    },
    {
      id_contacto: 6,
      tipo: 'cliente',
      nombre: 'Lucía Mendoza',
      documento: '47891234',
      telefono: '982345678',
    },
  ],
  operations: [],
  payments: [],
  returns: [],
  lots: [
    {
      id_lote: 1,
      id_producto: 1,
      nombre_producto: 'Paracetamol 500 mg',
      codigo_lote: 'PAR-2026-01',
      cantidad: 70,
      fecha_vencimiento: '2027-05-30',
      estado: 'vigente',
    },
    {
      id_lote: 2,
      id_producto: 1,
      nombre_producto: 'Paracetamol 500 mg',
      codigo_lote: 'PAR-2026-02',
      cantidad: 50,
      fecha_vencimiento: '2027-09-30',
      estado: 'vigente',
    },
    {
      id_lote: 3,
      id_producto: 2,
      nombre_producto: 'Ibuprofeno 400 mg',
      codigo_lote: 'IBU-2026-01',
      cantidad: 4,
      fecha_vencimiento: '2026-12-15',
      estado: 'vigente',
    },
    {
      id_lote: 4,
      id_producto: 3,
      nombre_producto: 'Alcohol medicinal 70%',
      codigo_lote: 'ALC-2026-01',
      cantidad: 45,
      fecha_vencimiento: '2027-06-30',
      estado: 'vigente',
    },
    {
      id_lote: 5,
      id_producto: 5,
      nombre_producto: 'Agua oxigenada',
      codigo_lote: 'AGU-2026-01',
      cantidad: 32,
      fecha_vencimiento: '2027-03-31',
      estado: 'vigente',
    },
  ],
  movements: [],
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadState() {
  if (typeof window === 'undefined') return clone(initialState)

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return clone(initialState)

    const parsed = JSON.parse(saved)

    return {
      ...clone(initialState),
      ...parsed,
      categories: Array.isArray(parsed.categories)
        ? parsed.categories
        : clone(initialState.categories),
      products: Array.isArray(parsed.products)
        ? parsed.products
        : clone(initialState.products),
      contacts: Array.isArray(parsed.contacts)
        ? parsed.contacts
        : clone(initialState.contacts),
      operations: Array.isArray(parsed.operations) ? parsed.operations : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      returns: Array.isArray(parsed.returns) ? parsed.returns : [],
      lots: Array.isArray(parsed.lots) ? parsed.lots : [],
      movements: Array.isArray(parsed.movements) ? parsed.movements : [],
    }
  } catch {
    return clone(initialState)
  }
}

let state = loadState()

export function getDemoState() {
  return state
}

export function updateDemoState(updater) {
  const nextState = updater(state)

  if (!nextState || typeof nextState !== 'object') {
    throw new Error('La actualización del almacén no produjo un estado válido.')
  }

  state = nextState

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('No se pudo guardar la información local:', error)
    }
  }

  return state
}

// [SIN USO] Utilidad de reinicio sin importadores ni llamadas en el proyecto.
// export function resetDemoState() {
//   state = clone(initialState)
//
//   if (typeof window !== 'undefined') {
//     window.localStorage.removeItem(STORAGE_KEY)
//   }
//
//   listeners.forEach((listener) => listener())
//   return state
// }

export function getNextDemoId(items, field) {
  return items.reduce((max, item) => {
    const value = Number(item[field]) || 0
    return Math.max(max, value)
  }, 0) + 1
}
