import { useContext } from 'react'
import { CategoryContext } from './categoryContext'

// Hook para acceder a las categorías compartidas.
export function useCategories() {
  const context = useContext(CategoryContext)

  if (!context) {
    throw new Error(
      'useCategories debe utilizarse dentro de CategoryProvider.',
    )
  }

  return context
}
