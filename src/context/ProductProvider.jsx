import { useSyncExternalStore } from 'react'
import { ProductContext } from './productContext'
import {
  getDemoState,
  subscribeDemoStore,
  updateDemoState,
  getNextDemoId,
} from '../services/demoStore'

export function ProductProvider({ children }) {
  const state = useSyncExternalStore(
    subscribeDemoStore,
    getDemoState,
    getDemoState,
  )

  const products = state.products.map((product) => ({
    ...product,
    id: product.id_producto ?? product.id,
    id_producto: product.id_producto ?? product.id,
    name: product.name ?? product.nombre,
    nombre: product.nombre ?? product.name,
    sku: product.sku ?? product.codigo_barras ?? '',
    category: product.category ?? product.categoria ?? '',
    price: Number(product.price ?? product.precio_venta ?? 0),
    precio_venta: Number(product.precio_venta ?? product.price ?? 0),
    stock: Number(product.stock ?? 0),
  }))

  const addProduct = (product) => {
    const name = String(product.name ?? '').trim()
    const sku = String(product.sku ?? '').trim()
    const category = String(product.category ?? '').trim()
    const price = Number(product.price)
    const stock = Number(product.stock)

    if (!name || !sku || !category) {
      return { success: false, message: 'Completa los datos del producto.' }
    }

    if (!Number.isFinite(price) || price <= 0) {
      return { success: false, message: 'El precio debe ser mayor que cero.' }
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return { success: false, message: 'El stock debe ser un entero igual o mayor que cero.' }
    }

    const exists = state.products.some(
      (item) => String(item.sku ?? item.codigo_barras).trim().toLowerCase() === sku.toLowerCase(),
    )

    if (exists) {
      return { success: false, message: 'Ya existe un producto con ese código.' }
    }

    updateDemoState((current) => {
      const id = getNextDemoId(current.products, 'id_producto')
      const newProduct = {
        id,
        id_producto: id,
        name,
        nombre: name,
        sku,
        codigo_barras: sku,
        category,
        categoria: category,
        price,
        precio_venta: price,
        precio_compra: 0,
        stock,
        stock_minimo: 10,
        estado: 'activo',
      }

      return { ...current, products: [...current.products, newProduct] }
    })

    return { success: true }
  }

  const updateProductStock = (productId, newStock) => {
    if (!Number.isInteger(newStock) || newStock < 0) {
      return {
        success: false,
        message: 'El stock debe ser un número entero igual o mayor que cero.',
      }
    }

    const exists = state.products.some(
      (product) => Number(product.id_producto ?? product.id) === Number(productId),
    )

    if (!exists) {
      return { success: false, message: 'No se encontró el producto.' }
    }

    updateDemoState((current) => ({
      ...current,
      products: current.products.map((product) => {
        const id = Number(product.id_producto ?? product.id)

        return id === Number(productId)
          ? { ...product, stock: newStock }
          : product
      }),
    }))

    return { success: true }
  }

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProductStock }}>
      {children}
    </ProductContext.Provider>
  )
}
