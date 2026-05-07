import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash, X } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function getSubmitLabel(isSubmitting, editingId) {
  if (isSubmitting) return 'Saving…'
  if (editingId) return 'Update Product'
  return 'Create Product'
}

function renderProductTable(isLoading, products, getCategoryName, toggleStatus, handleEdit, handleDelete) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    )
  }
  if (products.length === 0) {
    return <div className="py-12 text-center text-sm text-gray-400">No products yet. Create one!</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Image</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Price</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {products.map((product) => (
            <tr key={product._id} className="transition-colors hover:bg-gray-50">
              <td className="px-4 py-3">
                {product.thumbnail ? (
                  <img src={product.thumbnail} alt={product.name} className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200" />
                )}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
              <td className="px-4 py-3 text-gray-500">{getCategoryName(product.categoryId)}</td>
              <td className="px-4 py-3 text-gray-700">₹{Number(product.price || 0).toFixed(2)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${product.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {product.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleStatus(product)}
                  className={`mr-2 inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors ${product.isActive ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                >
                  {product.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(product)}
                  className="mr-2 inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Pencil size={13} className="mr-1" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(product._id)}
                  className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                >
                  <Trash size={13} className="mr-1" /> Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminProducts() {
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', discount: '', unit: 'kg',
    categoryId: '', subCategoryId: '', isActive: true,
  })
  const [productImageFiles, setProductImageFiles] = useState([])
  const [existingImageUrls, setExistingImageUrls] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingProductId, setEditingProductId] = useState('')

  const token = localStorage.getItem('authToken')

  useEffect(() => { fetchCategories(); fetchProducts() }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch(buildApiUrl(API_PATHS.categories.list))
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load categories')
      setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch (err) { setError(err.message || 'Unable to load categories') }
  }

  const fetchSubCategories = async (categoryId) => {
    if (!categoryId) { setSubCategories([]); return }
    try {
      const response = await fetch(buildApiUrl(API_PATHS.subCategories.getByCategory.replace(':categoryId', categoryId)))
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load sub-categories')
      setSubCategories(Array.isArray(data.subCategories) ? data.subCategories : [])
    } catch (err) { setError(err.message || 'Unable to load sub-categories'); setSubCategories([]) }
  }

  const fetchProducts = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(buildApiUrl(API_PATHS.products.list))
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load products')
      setProducts(Array.isArray(data.products) ? data.products : [])
    } catch (err) { setError(err.message || 'Unable to load products') }
    finally { setIsLoading(false) }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
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
        const uploadFormData = new FormData()
        productImageFiles.forEach((file) => uploadFormData.append('images', file))
        uploadFormData.append('folder', 'supermarket/products')
        const uploadResponse = await fetch(buildApiUrl(API_PATHS.uploads.images), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: uploadFormData,
        })
        const uploadData = await uploadResponse.json()
        if (!uploadResponse.ok) throw new Error(uploadData.message || 'Unable to upload images')
        uploadedImageUrls = Array.isArray(uploadData?.images) ? uploadData.images.map((img) => img.url).filter(Boolean) : []
      }
      if (!uploadedImageUrls.length) throw new Error('Please upload at least one product image')

      const payload = {
        name: formData.name, description: formData.description,
        price: Number.parseFloat(formData.price), discount: Number.parseFloat(formData.discount) || 0,
        unit: formData.unit, categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId || undefined,
        isActive: formData.isActive, images: uploadedImageUrls,
      }

      const endpoint = editingProductId
        ? API_PATHS.products.update.replace(':id', editingProductId)
        : API_PATHS.products.create

      const response = await fetch(buildApiUrl(endpoint), {
        method: editingProductId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save product')

      setFormData({ name: '', description: '', price: '', discount: '', unit: 'kg', categoryId: '', subCategoryId: '', isActive: true })
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
    setFormData({ name: product.name || '', description: product.description || '', price: product.price ?? '', discount: product.discount ?? '', unit: product.unit || 'kg', categoryId, subCategoryId, isActive: product.isActive ?? true })
    await fetchSubCategories(categoryId)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    try {
      const response = await fetch(buildApiUrl(API_PATHS.products.delete.replace(':id', id)), {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Unable to delete product')
      await fetchProducts()
    } catch (err) { setError(err.message) }
  }

  const getCategoryName = (id) => {
    if (id && typeof id === 'object' && id.name) return id.name
    const category = categories.find((item) => item._id === id)
    return category?.name || 'Unknown'
  }

  const toggleStatus = async (product) => {
    try {
      const response = await fetch(buildApiUrl(API_PATHS.products.update.replace(':id', product._id)), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to update status')
      await fetchProducts()
    } catch (err) { setError(err.message) }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setFormData({ name: '', description: '', price: '', discount: '', unit: 'kg', categoryId: '', subCategoryId: '', isActive: true })
    setProductImageFiles([])
    setExistingImageUrls([])
    setEditingProductId('')
    setSubCategories([])
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Catalogue</p>
          <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Products</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <Plus size={16} weight="bold" />
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {editingProductId ? 'Edit Product' : 'New Product'}
            </h3>
            <button type="button" onClick={handleCloseForm} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-name">
                  Name <span className="text-red-500">*</span>
                </label>
                <input id="prod-name" name="name" type="text" placeholder="e.g. Fresh Tomatoes" value={formData.name} onChange={handleChange} required
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-unit">
                  Unit <span className="text-red-500">*</span>
                </label>
                <input id="prod-unit" name="unit" type="text" placeholder="e.g. kg, liter, piece" value={formData.unit} onChange={handleChange}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-category">
                  Category <span className="text-red-500">*</span>
                </label>
                <select id="prod-category" name="categoryId" value={formData.categoryId} onChange={handleChange} required
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                  <option value="">Select a category</option>
                  {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-subcategory">
                  Sub-Category
                </label>
                <select id="prod-subcategory" name="subCategoryId" value={formData.subCategoryId} onChange={handleChange} disabled={!formData.categoryId}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-100 disabled:text-gray-400">
                  <option value="">{formData.categoryId ? 'No sub-category' : 'Select category first'}</option>
                  {subCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-price">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <input id="prod-price" name="price" type="number" step="0.01" min="0" placeholder="e.g. 100" value={formData.price} onChange={handleChange} required
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-discount">
                  Discount (%)
                </label>
                <input id="prod-discount" name="discount" type="number" step="0.01" min="0" max="100" placeholder="e.g. 10" value={formData.discount} onChange={handleChange}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-status">
                  Status
                </label>
                <select id="prod-status" name="isActive" value={String(formData.isActive)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.value === 'true' }))}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-description">
                Description
              </label>
              <textarea id="prod-description" name="description" placeholder="Optional product description" value={formData.description} onChange={handleChange} rows={2}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="prod-images">
                Images <span className="text-red-500">*</span>
              </label>
              <input id="prod-images" type="file" accept="image/*" multiple
                onChange={(e) => setProductImageFiles(Array.from(e.target.files || []).slice(0, 5))}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-gray-700 focus:border-gray-400 focus:outline-none" />
              <p className="mt-1 text-xs text-gray-400">Upload 1–5 images. Leave empty when editing to keep existing images.</p>
            </div>
            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button type="submit" disabled={isSubmitting}
                className="flex-1 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60">
                {getSubmitLabel(isSubmitting, editingProductId)}
              </button>
              <button type="button" onClick={handleCloseForm}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {renderProductTable(isLoading, products, getCategoryName, toggleStatus, handleEdit, handleDelete)}
      </div>
    </section>
  )
}

export default AdminProducts
