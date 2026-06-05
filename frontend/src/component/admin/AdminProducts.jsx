import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash, X, Warning } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function getSubmitLabel(isSubmitting, editingId) {
  if (isSubmitting) return 'Saving…'
  return editingId ? 'Update Product' : 'Create Product'
}

function AdminProducts() {
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', discount: '0', unit: 'kg',
    categoryId: '', subCategoryId: '', isActive: true,
    sku: '', hsnCode: '', gstRate: '0', stock: '0', lowStockThreshold: '10',
  })
  const [productImageFiles, setProductImageFiles] = useState([])
  const [existingImageUrls, setExistingImageUrls] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingProductId, setEditingProductId] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  const token = localStorage.getItem('authToken')

  useEffect(() => { fetchCategories(); fetchProducts() }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch(buildApiUrl(API_PATHS.categories.list))
      const data = await res.json()
      if (res.ok) setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch (_) {}
  }

  const fetchSubCategories = async (categoryId) => {
    if (!categoryId) { setSubCategories([]); return }
    try {
      const res = await fetch(buildApiUrl(API_PATHS.subCategories.getByCategory.replace(':categoryId', categoryId)))
      const data = await res.json()
      if (res.ok) setSubCategories(Array.isArray(data.subCategories) ? data.subCategories : [])
      else setSubCategories([])
    } catch (_) { setSubCategories([]) }
  }

  const fetchProducts = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.products.list))
      const data = await res.json()
      if (res.ok) setProducts(Array.isArray(data.products) ? data.products : [])
      else setError(data.message || 'Unable to load products')
    } catch (_) { setError('Unable to load products') }
    finally { setIsLoading(false) }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      if (name === 'categoryId') { fetchSubCategories(value); return { ...prev, categoryId: value, subCategoryId: '' } }
      return { ...prev, [name]: value }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      let uploadedImageUrls = existingImageUrls
      if (productImageFiles.length > 0) {
        const fd = new FormData()
        productImageFiles.forEach((f) => fd.append('images', f))
        fd.append('folder', 'supermarket/products')
        const upRes = await fetch(buildApiUrl(API_PATHS.uploads.images), {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
        })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.message || 'Unable to upload images')
        uploadedImageUrls = Array.isArray(upData?.images) ? upData.images.map((img) => img.url).filter(Boolean) : []
      }
      if (!uploadedImageUrls.length) throw new Error('Please upload at least one product image')

      const payload = {
        name: formData.name, description: formData.description,
        price: parseFloat(formData.price), discount: parseFloat(formData.discount) || 0,
        unit: formData.unit, categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId || undefined,
        isActive: formData.isActive, images: uploadedImageUrls,
        sku: formData.sku || '',
        hsnCode: formData.hsnCode || '',
        gstRate: Number.parseFloat(formData.gstRate) || 0,
        stock: parseInt(formData.stock, 10) || 0,
        lowStockThreshold: parseInt(formData.lowStockThreshold, 10) || 10,
      }

      const endpoint = editingProductId
        ? API_PATHS.products.update.replace(':id', editingProductId)
        : API_PATHS.products.create

      const res = await fetch(buildApiUrl(endpoint), {
        method: editingProductId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Unable to save product')

      setFormData({ name: '', description: '', price: '', discount: '0', unit: 'kg', categoryId: '', subCategoryId: '', isActive: true, sku: '', hsnCode: '', gstRate: '0', stock: '0', lowStockThreshold: '10' })
      setProductImageFiles([])
      setExistingImageUrls([])
      setEditingProductId('')
      setShowForm(false)
      await fetchProducts()
    } catch (err) { setError(err.message || 'Unable to save product') }
    finally { setIsSubmitting(false) }
  }

  const handleEdit = async (product) => {
    const categoryId = product.categoryId && typeof product.categoryId === 'object' ? product.categoryId._id : product.categoryId || ''
    const subCategoryId = product.subCategoryId && typeof product.subCategoryId === 'object' ? product.subCategoryId._id : product.subCategoryId || ''
    setShowForm(true)
    setEditingProductId(product._id)
    setProductImageFiles([])
    setExistingImageUrls(Array.isArray(product.images) ? product.images : [])
    setFormData({
      name: product.name || '', description: product.description || '',
      price: product.price ?? '', discount: product.discount ?? '0',
      unit: product.unit || 'kg', categoryId, subCategoryId,
      isActive: product.isActive ?? true,
      sku: product.sku || '', hsnCode: product.hsnCode || '', gstRate: String(product.gstRate ?? 0),
      stock: String(product.stock ?? 0), lowStockThreshold: String(product.lowStockThreshold ?? 10),
    })
    await fetchSubCategories(categoryId)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    try {
      const res = await fetch(buildApiUrl(API_PATHS.products.delete.replace(':id', id)), {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Unable to delete product')
      await fetchProducts()
    } catch (err) { setError(err.message) }
  }

  const getCategoryName = (id) => {
    if (id && typeof id === 'object' && id.name) return id.name
    return categories.find((c) => c._id === id)?.name || '—'
  }

  const toggleStatus = async (product) => {
    try {
      const res = await fetch(buildApiUrl(API_PATHS.products.update.replace(':id', product._id)), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      if (!res.ok) throw new Error('Unable to update status')
      await fetchProducts()
    } catch (err) { setError(err.message) }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setFormData({ name: '', description: '', price: '', discount: '0', unit: 'kg', categoryId: '', subCategoryId: '', isActive: true, sku: '', hsnCode: '', gstRate: '0', stock: '0', lowStockThreshold: '10' })
    setProductImageFiles([])
    setExistingImageUrls([])
    setEditingProductId('')
    setSubCategories([])
  }

  const displayedProducts = products.filter((p) => {
    const matchStatus = filterStatus === 'all' ? true : filterStatus === 'active' ? p.isActive : filterStatus === 'inactive' ? !p.isActive : filterStatus === 'low' ? (p.stock <= (p.lowStockThreshold ?? 10) && p.stock > 0) : filterStatus === 'out' ? p.stock === 0 : true
    const matchSearch = !search.trim() || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const lowStockCount = products.filter((p) => p.stock <= (p.lowStockThreshold ?? 10) && p.stock > 0).length
  const outOfStockCount = products.filter((p) => p.stock === 0).length

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Catalogue</p>
          <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Products</h2>
          <p className="mt-0.5 text-sm text-gray-500">{products.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-44"
          />
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            <Plus size={16} weight="bold" />
            {showForm ? 'Cancel' : 'Add Product'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {outOfStockCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
              <Warning size={13} weight="bold" /> {outOfStockCount} out of stock
            </span>
          )}
          {lowStockCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              <Warning size={13} weight="bold" /> {lowStockCount} low stock
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'inactive', label: 'Inactive' }, { key: 'low', label: 'Low Stock' }, { key: 'out', label: 'Out of Stock' }].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterStatus(key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === key ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">{editingProductId ? 'Edit Product' : 'New Product'}</h3>
            <button type="button" onClick={handleCloseForm} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-name">Name *</label>
                <input id="prod-name" name="name" type="text" placeholder="e.g. Fresh Tomatoes" value={formData.name} onChange={handleChange} required
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* SKU */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-sku">SKU</label>
                <input id="prod-sku" name="sku" type="text" placeholder="e.g. VEG-001" value={formData.sku} onChange={handleChange}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* HSN Code */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-hsn">HSN Code</label>
                <input id="prod-hsn" name="hsnCode" type="text" placeholder="e.g. 1001" value={formData.hsnCode} onChange={handleChange}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* GST Rate */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-gst">GST Rate (%)</label>
                <select id="prod-gst" name="gstRate" value={formData.gstRate} onChange={handleChange}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                  <option value="0">0% (Nil/Exempt)</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
              {/* Unit */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-unit">Unit *</label>
                <input id="prod-unit" name="unit" type="text" placeholder="kg, liter, piece" value={formData.unit} onChange={handleChange}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-category">Category *</label>
                <select id="prod-category" name="categoryId" value={formData.categoryId} onChange={handleChange} required
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                  <option value="">Select a category</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              {/* Sub-Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-sub">Sub-Category</label>
                <select id="prod-sub" name="subCategoryId" value={formData.subCategoryId} onChange={handleChange} disabled={!formData.categoryId}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-100 disabled:text-gray-400">
                  <option value="">{formData.categoryId ? 'None' : 'Select category first'}</option>
                  {subCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              {/* Price */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-price">Price (₹) *</label>
                <input id="prod-price" name="price" type="number" step="0.01" min="0" placeholder="100" value={formData.price} onChange={handleChange} required
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Discount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-discount">Discount (%)</label>
                <input id="prod-discount" name="discount" type="number" step="0.01" min="0" max="100" placeholder="0" value={formData.discount} onChange={handleChange}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Stock */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-stock">Stock Qty</label>
                <input id="prod-stock" name="stock" type="number" min="0" placeholder="0" value={formData.stock} onChange={handleChange}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Low Stock Threshold */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-threshold">Low Stock Alert</label>
                <input id="prod-threshold" name="lowStockThreshold" type="number" min="0" placeholder="10" value={formData.lowStockThreshold} onChange={handleChange}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-status">Status</label>
                <select id="prod-status" value={String(formData.isActive)}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.value === 'true' }))}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-desc">Description</label>
              <textarea id="prod-desc" name="description" placeholder="Optional product description" value={formData.description} onChange={handleChange} rows={2}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            </div>
            {/* Images */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-images">Images *</label>
              <input id="prod-images" type="file" accept="image/*" multiple
                onChange={(e) => setProductImageFiles(Array.from(e.target.files || []).slice(0, 5))}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-gray-700 focus:border-gray-400 focus:outline-none" />
              <p className="mt-1 text-xs text-gray-400">Upload 1–5 images. Leave empty when editing to keep existing images.</p>
            </div>
            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button type="submit" disabled={isSubmitting}
                className="flex-1 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60">
                {getSubmitLabel(isSubmitting, editingProductId)}
              </button>
              <button type="button" onClick={handleCloseForm}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No products found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Image</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">SKU / HSN</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">GST</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Price (incl. GST)</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {displayedProducts.map((product) => {
                  const isLow = product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 10)
                  const isOut = product.stock === 0
                  return (
                    <tr key={product._id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {product.thumbnail
                          ? <img src={product.thumbnail} alt={product.name} className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
                          : <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200" />}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        <div>{product.sku || '—'}</div>
                        {product.hsnCode && <div className="text-gray-400">HSN: {product.hsnCode}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{product.gstRate > 0 ? `${product.gstRate}%` : 'Nil'}</td>
                      <td className="px-4 py-3 text-gray-500">{getCategoryName(product.categoryId)}</td>
                      <td className="px-4 py-3 text-gray-700">
                        ₹{Number(product.price || 0).toFixed(2)}
                        {product.discount > 0 && <span className="ml-1 text-xs text-emerald-600">(-{product.discount}%)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${isOut ? 'bg-red-50 text-red-700 border-red-200' : isLow ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {isOut ? 'Out' : `${product.stock}`}
                          {isLow && !isOut && ' ⚠'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${product.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button type="button" onClick={() => toggleStatus(product)}
                          className={`mr-1 inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${product.isActive ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                          {product.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" onClick={() => handleEdit(product)}
                          className="mr-1 inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          <Pencil size={13} className="mr-1" /> Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(product._id)}
                          className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                          <Trash size={13} className="mr-1" /> Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminProducts
