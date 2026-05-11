import { useEffect, useState, useMemo } from 'react'
import { MagnifyingGlass, Warning, Check, X } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function StockEditModal({ product, onClose, onSaved }) {
  const [stock, setStock] = useState(String(product.stock ?? 0))
  const [threshold, setThreshold] = useState(String(product.lowStockThreshold ?? 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const token = localStorage.getItem('authToken')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.products.update.replace(':id', product._id)), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stock: parseInt(stock, 10) || 0, lowStockThreshold: parseInt(threshold, 10) || 10 }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to update'); setSaving(false); return }
      onSaved(data.product)
    } catch (_) {
      setError('Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Update Stock</h2>
            <p className="mt-0.5 text-xs text-gray-500 truncate max-w-[220px]">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="inv-stock">Stock Quantity</label>
            <input id="inv-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="inv-threshold">Low Stock Alert Threshold</label>
            <input id="inv-threshold" type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            <p className="mt-1 text-xs text-gray-400">Alert when stock falls at or below this number.</p>
          </div>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60">
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check size={14} weight="bold" />}
              {saving ? 'Saving…' : 'Save Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminInventory() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingProduct, setEditingProduct] = useState(null)

  useEffect(() => {
    fetch(buildApiUrl(API_PATHS.products.list))
      .then((r) => r.json())
      .then((data) => { if (data.products) setProducts(data.products) })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (updated) => {
    setProducts((prev) => prev.map((p) => (p._id === updated._id ? { ...p, stock: updated.stock, lowStockThreshold: updated.lowStockThreshold } : p)))
    setEditingProduct(null)
  }

  const stats = useMemo(() => ({
    total: products.length,
    inStock: products.filter((p) => p.stock > (p.lowStockThreshold ?? 10)).length,
    lowStock: products.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 10)).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    totalValue: products.reduce((s, p) => s + (p.stock || 0) * (p.price || 0), 0),
  }), [products])

  const displayed = useMemo(() => {
    let list = products
    if (filter === 'in') list = list.filter((p) => p.stock > (p.lowStockThreshold ?? 10))
    else if (filter === 'low') list = list.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 10))
    else if (filter === 'out') list = list.filter((p) => p.stock === 0)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
    }
    return list
  }, [products, filter, search])

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" /></div>

  return (
    <section className="space-y-5">
      {editingProduct && <StockEditModal product={editingProduct} onClose={() => setEditingProduct(null)} onSaved={handleSaved} />}

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Stock Control</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Inventory Management</h2>
        <p className="mt-0.5 text-sm text-gray-500">Track and update product stock levels.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total Products', value: stats.total, color: 'text-gray-900' },
          { label: 'In Stock', value: stats.inStock, color: 'text-emerald-600' },
          { label: 'Low Stock', value: stats.lowStock, color: 'text-amber-600' },
          { label: 'Out of Stock', value: stats.outOfStock, color: 'text-red-600' },
          { label: 'Stock Value', value: `₹${Math.round(stats.totalValue).toLocaleString('en-IN')}`, color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
            <p className={`mt-1.5 text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {stats.lowStock > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Warning size={18} weight="bold" className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{stats.lowStock} product{stats.lowStock !== 1 ? 's' : ''} running low on stock</p>
            <p className="mt-0.5 text-xs text-amber-700">Restock these items to avoid stockouts.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[{ k: 'all', l: 'All' }, { k: 'in', l: 'In Stock' }, { k: 'low', l: 'Low Stock' }, { k: 'out', l: 'Out of Stock' }].map(({ k, l }) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === k ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-52" />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Alert At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {displayed.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-400">No products found.</td></tr>
              ) : displayed.map((p) => {
                const isOut = p.stock === 0
                const isLow = !isOut && p.stock <= (p.lowStockThreshold ?? 10)
                const isOk = !isOut && !isLow
                const stockVal = Math.round((p.stock || 0) * (p.price || 0))
                return (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.thumbnail
                          ? <img src={p.thumbnail} alt={p.name} className="h-9 w-9 rounded-lg object-cover border border-gray-200 shrink-0" />
                          : <div className="h-9 w-9 rounded-lg bg-gray-100 border border-gray-200 shrink-0" />}
                        <span className="font-medium text-gray-900 truncate max-w-[160px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.categoryId && typeof p.categoryId === 'object' ? p.categoryId.name : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">₹{Number(p.price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className={`font-semibold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>{p.stock ?? 0}</span>
                        <span className="text-[11px] text-gray-400">₹{stockVal.toLocaleString('en-IN')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.lowStockThreshold ?? 10}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${isOut ? 'bg-red-50 text-red-700 border-red-200' : isLow ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {isOut ? 'Out of Stock' : isLow ? '⚠ Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setEditingProduct(p)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        Update Stock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {displayed.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5">
            <p className="text-xs text-gray-400">{displayed.length} product{displayed.length !== 1 ? 's' : ''} shown</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminInventory
