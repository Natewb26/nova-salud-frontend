
import { useMemo, useState } from 'react'
import { useCategories } from '../../context/useCategories'
import { useProducts } from '../../context/useProducts'
import {
  Package,
  Plus,
  Search,
  X,
  AlertTriangle,
  Boxes,
} from 'lucide-react'

// Componente principal del módulo Productos.
export default function Productos() {
  // Estados para controlar la búsqueda, los filtros y el formulario.
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')
  const [status, setStatus] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [formError, setFormError] = useState('')

  // Acceso al catálogo compartido de productos.
  const { products, addProduct } = useProducts()

  // Acceso a las categorías compartidas del sistema.
  const { categories } = useCategories()

  // Filtrar productos por nombre, código, categoría y estado.
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchText = search.toLowerCase()

      const matchesSearch =
        product.name.toLowerCase().includes(searchText) ||
        product.sku.toLowerCase().includes(searchText)

      const matchesCategory =
        category === 'Todas' || product.category === category

      const matchesStatus =
        status === 'Todos' ||
        (status === 'Disponible' && product.stock > 5) ||
        (status === 'Stock bajo' &&
          product.stock > 0 &&
          product.stock <= 5) ||
        (status === 'Agotado' && product.stock === 0)

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [products, search, category, status])

  // Calcular la cantidad de productos que tienen stock bajo.
  const lowStock = products.filter(
    (product) => product.stock > 0 && product.stock <= 5,
  ).length

  // Registrar un nuevo producto en el catálogo compartido.
  const handleAddProduct = (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    // Obtener y preparar los datos del formulario.
    const newProduct = {
      id: Date.now(),
      name: formData.get('name').trim(),
      sku: formData.get('sku').trim(),
      category: formData.get('category'),
      price: Number(formData.get('price')),
      stock: Number(formData.get('stock')),
    }

    // Enviar el producto al contexto compartido.
    const result = addProduct(newProduct)

    // Mostrar el error si el código ya está registrado.
    if (!result.success) {
      setFormError(result.message)
      return
    }

    // Limpiar el formulario y cerrar la ventana si el registro fue exitoso.
    setFormError('')
    event.currentTarget.reset()
    setShowModal(false)
  }

  // Abrir el formulario de registro de productos.
  const openProductModal = () => {
    setFormError('')
    setShowModal(true)
  }

  // Cerrar el formulario y limpiar los mensajes de error.
  const closeProductModal = () => {
    setFormError('')
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Encabezado del módulo y botón para registrar productos. */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Productos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra el catálogo de productos de la farmacia.
          </p>
        </div>

        <button
          type="button"
          onClick={openProductModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <Plus size={18} />
          Nuevo producto
        </button>
      </div>

      {/* Indicadores generales del catálogo de productos. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Total de productos registrados. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Productos registrados
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {products.length}
              </p>
            </div>

            <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
              <Package size={23} />
            </div>
          </div>
        </div>

        {/* Total de productos con stock bajo. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Productos con stock bajo
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {lowStock}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <AlertTriangle size={23} />
            </div>
          </div>
        </div>
      </div>

      {/* Sección de búsqueda y filtros del catálogo. */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row">

          {/* Buscar productos por nombre o código. */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {/* Filtrar productos por las categorías registradas. */}
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="Todas">Todas las categorías</option>

            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {/* Filtrar productos según su disponibilidad de stock. */}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="Stock bajo">Stock bajo</option>
            <option value="Agotado">Agotado</option>
          </select>
        </div>

        {/* Tabla principal con la información de los productos. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-187.5 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Producto</th>
                <th className="px-5 py-4 font-semibold">Código</th>
                <th className="px-5 py-4 font-semibold">Categoría</th>
                <th className="px-5 py-4 font-semibold">Precio</th>
                <th className="px-5 py-4 font-semibold">Stock</th>
                <th className="px-5 py-4 font-semibold">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* Recorrer y mostrar los productos filtrados. */}
              {filteredProducts.map((product) => {
                // Determinar el estado del stock de cada producto.
                const productStatus =
                  product.stock === 0
                    ? 'Agotado'
                    : product.stock <= 5
                      ? 'Stock bajo'
                      : 'Disponible'

                return (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {product.name}
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {product.sku}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {product.category}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-700">
                      S/ {product.price.toFixed(2)}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {product.stock} unidades
                    </td>

                    {/* Mostrar una etiqueta según el stock disponible. */}
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          productStatus === 'Disponible'
                            ? 'bg-emerald-50 text-emerald-700'
                            : productStatus === 'Stock bajo'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {productStatus}
                      </span>
                    </td>
                  </tr>
                )
              })}

              {/* Mensaje cuando no existen resultados para los filtros. */}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center">
                    <Boxes
                      size={32}
                      className="mx-auto mb-2 text-slate-300"
                    />

                    <p className="font-medium text-slate-600">
                      No se encontraron productos
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Prueba con otro término o cambia los filtros.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resumen de productos visibles y registrados. */}
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Mostrando {filteredProducts.length} de {products.length} productos
        </div>
      </section>

      {/* Ventana modal para registrar un nuevo producto. */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">

            {/* Encabezado y botón para cerrar la ventana. */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Registrar producto
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Completa la información del producto.
                </p>
              </div>

              <button
                type="button"
                onClick={closeProductModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Cerrar formulario"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario de registro de productos. */}
            <form onSubmit={handleAddProduct} className="space-y-4">

              {/* Mostrar mensajes de validación cuando sea necesario. */}
              {formError && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </p>
              )}

              {/* Nombre del producto. */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nombre del producto
                </label>

                <input
                  name="name"
                  type="text"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                  placeholder="Ej. Paracetamol 500 mg"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                {/* Código único del producto. */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Código
                  </label>

                  <input
                    name="sku"
                    type="text"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                    placeholder="MED-003"
                  />
                </div>

                {/* Seleccionar una categoría existente. */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Categoría
                  </label>

                  <select
                    name="category"
                    required
                    defaultValue={categories[0] ?? ''}
                    disabled={categories.length === 0}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-100"
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Precio de venta del producto. */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Precio (S/)
                  </label>

                  <input
                    name="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                    placeholder="10.50"
                  />
                </div>

                {/* Cantidad inicial disponible en inventario. */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Stock inicial
                  </label>

                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
                    placeholder="50"
                  />
                </div>
              </div>

              {/* Botones para cancelar o guardar el registro. */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={categories.length === 0}
                  className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Guardar producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
