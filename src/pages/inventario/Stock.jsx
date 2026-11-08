import { useEffect, useMemo, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { getErrorMessage } from '../../services/apiErrors'
import {
  ajustarLote,
  crearProducto,
  editarProducto,
  getCategorias,
  getProductos,
} from '../../services/inventoryService'
import ProductDetailModal from './ProductDetailModal'
import ProductFormModal from './ProductFormModal'
import StockAdjustmentModal from './StockAdjustmentModal'

const PAGE_SIZE = 20
const moneyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

const stockStyles = {
  agotado: 'bg-red-50 text-red-700',
  bajo: 'bg-amber-50 text-amber-700',
  normal: 'bg-emerald-50 text-emerald-700',
}

const stockLabels = {
  agotado: 'Agotado',
  bajo: 'Stock bajo',
  normal: 'Normal',
}

const categoryId = (category) =>
  category.id_categoria ?? category.id ?? category.nombre

const categoryName = (category) =>
  category.nombre ?? category.name ?? String(category)

const productCategory = (product) =>
  product.categoria?.nombre ??
  product.nombre_categoria ??
  product.categoria ??
  '—'

const formatDate = (value) => {
  if (!value) return '—'
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export default function Stock() {
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [stockLevel, setStockLevel] = useState('')
  const [sort, setSort] = useState('nombre')
  const [page, setPage] = useState(1)
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [formMode, setFormMode] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [adjustingLot, setAdjustingLot] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    )
    return () => window.clearTimeout(timer)
  }, [search])

  const params = useMemo(() => ({
    page,
    page_size: PAGE_SIZE,
    sort,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(category ? { categoria: category } : {}),
    ...(stockLevel ? { nivel_stock: stockLevel } : {}),
  }), [page, sort, debouncedSearch, category, stockLevel])

  const productsQuery = useQuery({
    queryKey: ['productos', params],
    queryFn: () => getProductos(params),
    placeholderData: keepPreviousData,
  })
  const categoriesQuery = useQuery({
    queryKey: ['categorias'],
    queryFn: getCategorias,
  })

  const refreshInventory = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['productos'] }),
      queryClient.invalidateQueries({ queryKey: ['producto'] }),
      queryClient.invalidateQueries({ queryKey: ['lotes'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: crearProducto,
    onSuccess: refreshInventory,
  })
  const editMutation = useMutation({
    mutationFn: ({ id, data }) => editarProducto(id, data),
    onSuccess: refreshInventory,
  })
  const adjustMutation = useMutation({
    mutationFn: ({ id, data }) => ajustarLote(id, data),
    onSuccess: refreshInventory,
  })

  const products = productsQuery.data?.data ?? []
  const meta = productsQuery.data?.meta ?? {
    page,
    page_size: PAGE_SIZE,
    total: 0,
    total_pages: 1,
  }
  const categories = categoriesQuery.data ?? []

  const changeSort = (field) => {
    setPage(1)
    setSort((current) => {
      if (current === field) return `-${field}`
      if (current === `-${field}`) return field
      return field
    })
  }

  const sortIcon = (field) => {
    if (sort === field) return <ArrowUp size={14} />
    if (sort === `-${field}`) return <ArrowDown size={14} />
    return <ArrowUpDown size={14} className="text-slate-300" />
  }

  const openCreate = () => {
    setEditingProduct(null)
    setFormMode('create')
  }

  const openEdit = (product) => {
    setEditingProduct(product)
    setFormMode('edit')
  }

  const submitProduct = (data) =>
    formMode === 'edit'
      ? editMutation.mutateAsync({ id: editingProduct.id_producto, data })
      : createMutation.mutateAsync(data)

  const disableProduct = async (product) => {
    const confirmed = window.confirm(
      `¿Deseas desactivar el producto “${product.nombre}”?`,
    )

    if (!confirmed) return
    setActionError('')

    try {
      await editMutation.mutateAsync({
        id: product.id_producto,
        data: { estado: 'inactivo' },
      })
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Productos e inventario</h2>
          <p className="mt-1 text-sm text-slate-500">
            Consulta existencias, vencimientos y datos del catálogo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => productsQuery.refetch()}
            disabled={productsQuery.isFetching}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={productsQuery.isFetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
          {isAdmin && (
            <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
              <Plus size={17} />
              Nuevo producto
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[1fr_220px_190px]">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Nombre, principio activo o código de barras..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
        >
          <option value="">Todas las categorías</option>
          {categories.map((item) => (
            <option key={categoryId(item)} value={categoryId(item)}>
              {categoryName(item)}
            </option>
          ))}
        </select>
        <select
          value={stockLevel}
          onChange={(event) => {
            setStockLevel(event.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
        >
          <option value="">Todos los niveles</option>
          <option value="agotado">Agotado</option>
          <option value="bajo">Stock bajo</option>
          <option value="normal">Normal</option>
        </select>
      </div>

      {productsQuery.isError && (
        <div className="m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">No se pudo cargar el inventario</p>
            <p className="mt-1 text-sm">{getErrorMessage(productsQuery.error)}</p>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {productsQuery.isPending ? (
        <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          Cargando productos...
        </div>
      ) : !productsQuery.isError && products.length === 0 ? (
        <div className="p-12 text-center">
          <Boxes size={34} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-600">No se encontraron productos</p>
          <p className="mt-1 text-xs text-slate-400">Prueba con otros filtros de búsqueda.</p>
        </div>
      ) : !productsQuery.isError && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-250 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <SortableHeader field="nombre" label="Producto" onSort={changeSort} icon={sortIcon('nombre')} />
                <SortableHeader field="codigo_barras" label="Código" onSort={changeSort} icon={sortIcon('codigo_barras')} />
                <SortableHeader field="categoria" label="Categoría" onSort={changeSort} icon={sortIcon('categoria')} />
                <SortableHeader field="precio_venta" label="Precio" onSort={changeSort} icon={sortIcon('precio_venta')} />
                <SortableHeader field="stock_disponible" label="Stock" onSort={changeSort} icon={sortIcon('stock_disponible')} />
                <th className="px-5 py-4 font-semibold">Nivel</th>
                <SortableHeader field="proximo_vencimiento" label="Próximo vencimiento" onSort={changeSort} icon={sortIcon('proximo_vencimiento')} />
                <th className="px-5 py-4 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => {
                const level = product.nivel_stock ?? 'normal'
                return (
                  <tr
                    key={product.id_producto}
                    onClick={() => setSelectedProductId(product.id_producto)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{product.nombre}</p>
                      <p className="mt-1 text-xs text-slate-400">{product.principio_activo || 'Sin principio activo'}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{product.codigo_barras || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{productCategory(product)}</td>
                    <td className="px-5 py-4 font-medium text-slate-700">{moneyFormatter.format(Number(product.precio_venta ?? 0))}</td>
                    <td className="px-5 py-4 text-slate-600">{product.stock_disponible ?? 0}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stockStyles[level] ?? stockStyles.normal}`}>
                        {stockLabels[level] ?? level}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(product.proximo_vencimiento)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.estado === 'inactivo' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {product.estado ?? 'activo'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
        <span>Mostrando {products.length} de {meta.total} productos</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={meta.page <= 1 || productsQuery.isFetching} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" aria-label="Página anterior">
            <ChevronLeft size={16} />
          </button>
          <span>Página {meta.page} de {meta.total_pages}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(meta.total_pages, current + 1))} disabled={meta.page >= meta.total_pages || productsQuery.isFetching} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" aria-label="Página siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          isAdmin={isAdmin}
          onClose={() => setSelectedProductId(null)}
          onEdit={openEdit}
          onDisable={disableProduct}
          onAdjustLot={setAdjustingLot}
          disabling={editMutation.isPending}
        />
      )}

      {formMode && (
        <ProductFormModal
          key={`${formMode}-${editingProduct?.id_producto ?? 'new'}`}
          product={editingProduct}
          categories={categories}
          onClose={() => setFormMode(null)}
          onSubmit={submitProduct}
        />
      )}

      {adjustingLot && (
        <StockAdjustmentModal
          lot={adjustingLot}
          onClose={() => setAdjustingLot(null)}
          onSubmit={(data) => adjustMutation.mutateAsync({ id: adjustingLot.id_lote, data })}
        />
      )}
    </section>
  )
}

function SortableHeader({ field, label, onSort, icon }) {
  return (
    <th className="px-5 py-4 font-semibold">
      <button type="button" onClick={() => onSort(field)} className="flex items-center gap-1.5 whitespace-nowrap hover:text-slate-800">
        {label}
        {icon}
      </button>
    </th>
  )
}
