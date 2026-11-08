import { useContext } from 'react'
import { ProductContext } from './productContext'

// Hook para acceder a los productos compartidos.
export function useProducts() {
  const context = useContext(ProductContext)

  if (!context) {
    throw new Error(
      'useProducts debe utilizarse dentro de ProductProvider.',
    )
  }

  return context
}
