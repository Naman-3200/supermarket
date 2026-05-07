import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash, X } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function getSubmitLabel(isSubmitting, editingId) {
  if (isSubmitting) return 'Saving…'
  if (editingId) return 'Update Sub-Category'
  return 'Create Sub-Category'
}

function renderTableContent(isLoading, subCategories, getCategoryName, handleEdit, handleDelete) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    )
  }
  if (subCategories.length === 0) {
    return <div className="py-12 text-center text-sm text-gray-400">No sub-categories yet. Create one!</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {subCategories.map((subCat) => (
            <tr key={subCat._id} className="transition-colors hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{subCat.name}</td>
              <td className="px-4 py-3 text-gray-500">{getCategoryName(subCat.categoryId)}</td>
              <td className="max-w-xs truncate px-4 py-3 text-gray-500">{subCat.description || '—'}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => handleEdit(subCat)}
                  className="mr-2 inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Pencil size={13} className="mr-1" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(subCat._id)}
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

function AdminSubCategories() {
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', categoryId: '', image: '' })
  const [subCategoryImageFile, setSubCategoryImageFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingSubCategoryId, setEditingSubCategoryId] = useState('')

  const token = localStorage.getItem('authToken')

  useEffect(() => {
    fetchCategories()
    fetchSubCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch(buildApiUrl(API_PATHS.categories.list))
      const data = await response.json()
      if (response.ok) setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch (err) {
      console.warn('Failed to load categories:', err.message)
    }
  }

  const fetchSubCategories = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(buildApiUrl(API_PATHS.subCategories.list))
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load sub-categories')
      setSubCategories(Array.isArray(data.subCategories) ? data.subCategories : [])
    } catch (err) {
      setError(err.message || 'Unable to load sub-categories')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      let uploadedImageUrl = formData.image
      if (subCategoryImageFile) {
        const uploadFormData = new FormData()
        uploadFormData.append('images', subCategoryImageFile)
        uploadFormData.append('folder', 'supermarket/subcategories')
        const uploadResponse = await fetch(buildApiUrl(API_PATHS.uploads.images), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: uploadFormData,
        })
        const uploadData = await uploadResponse.json()
        if (!uploadResponse.ok) throw new Error(uploadData.message || 'Unable to upload image')
        uploadedImageUrl = uploadData?.images?.[0]?.url || ''
      }

      const isEditing = Boolean(editingSubCategoryId)
      const endpoint = isEditing
        ? API_PATHS.subCategories.update.replace(':id', editingSubCategoryId)
        : API_PATHS.subCategories.create

      const response = await fetch(buildApiUrl(endpoint), {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, image: uploadedImageUrl }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save sub-category')

      setFormData({ name: '', description: '', categoryId: '', image: '' })
      setSubCategoryImageFile(null)
      setEditingSubCategoryId('')
      setShowForm(false)
      await fetchSubCategories()
    } catch (err) {
      setError(err.message || 'Unable to save sub-category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (subCategory) => {
    setShowForm(true)
    setEditingSubCategoryId(subCategory._id)
    setSubCategoryImageFile(null)
    setFormData({
      name: subCategory.name || '',
      description: subCategory.description || '',
      categoryId:
        subCategory.categoryId && typeof subCategory.categoryId === 'object'
          ? subCategory.categoryId._id
          : subCategory.categoryId || '',
      image: subCategory.image || '',
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this sub-category?')) return
    try {
      const response = await fetch(buildApiUrl(API_PATHS.subCategories.delete.replace(':id', id)), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Unable to delete sub-category')
      await fetchSubCategories()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setFormData({ name: '', description: '', categoryId: '', image: '' })
    setSubCategoryImageFile(null)
    setEditingSubCategoryId('')
  }

  const getCategoryName = (id) => {
    if (id && typeof id === 'object' && id.name) return id.name
    const cat = categories.find((c) => c._id === id)
    return cat?.name || 'Unknown'
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Catalogue</p>
          <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Sub-Categories</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <Plus size={16} weight="bold" />
          {showForm ? 'Cancel' : 'Add Sub-Category'}
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
              {editingSubCategoryId ? 'Edit Sub-Category' : 'New Sub-Category'}
            </h3>
            <button type="button" onClick={handleCloseForm} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="subcat-category">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="subcat-category"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                required
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="subcat-name">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="subcat-name"
                name="name"
                type="text"
                placeholder="e.g. Fresh Vegetables"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="subcat-desc">
                Description
              </label>
              <textarea
                id="subcat-desc"
                name="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="subcat-image">
                Image
              </label>
              <input
                id="subcat-image"
                type="file"
                accept="image/*"
                onChange={(e) => setSubCategoryImageFile(e.target.files?.[0] || null)}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-gray-700 focus:border-gray-400 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">Leave empty to keep the existing image when editing.</p>
            </div>
            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
              >
                {getSubmitLabel(isSubmitting, editingSubCategoryId)}
              </button>
              <button
                type="button"
                onClick={handleCloseForm}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {renderTableContent(isLoading, subCategories, getCategoryName, handleEdit, handleDelete)}
      </div>
    </section>
  )
}

export default AdminSubCategories
