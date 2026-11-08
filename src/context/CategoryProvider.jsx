import { useSyncExternalStore } from 'react'
import { CategoryContext } from './categoryContext'
import {
  getDemoState,
  subscribeDemoStore,
  updateDemoState,
} from '../services/demoStore'

export function CategoryProvider({ children }) {
  const state = useSyncExternalStore(
    subscribeDemoStore,
    getDemoState,
    getDemoState,
  )

  const categories = state.categories

  const addCategory = (name) => {
    const normalizedName = String(name ?? '').trim()

    if (!normalizedName) {
      return { success: false, message: 'Ingresa el nombre de la categoría.' }
    }

    const exists = categories.some(
      (category) => category.toLowerCase() === normalizedName.toLowerCase(),
    )

    if (exists) {
      return { success: false, message: 'Esta categoría ya está registrada.' }
    }

    updateDemoState((current) => ({
      ...current,
      categories: [...current.categories, normalizedName],
    }))

    return { success: true }
  }

  return (
    <CategoryContext.Provider value={{ categories, addCategory }}>
      {children}
    </CategoryContext.Provider>
  )
}
