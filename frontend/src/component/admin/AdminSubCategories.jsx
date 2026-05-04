import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function AdminSubCategories() {
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    image: '',
  })
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

      if (response.ok) {
        setCategories(Array.isArray(data.categories) ? data.categories : [])
      }
    } catch (err) {
      console.error('Unable to load categories')
    }
  }

  const fetchSubCategories = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(buildApiUrl(API_PATHS.subCategories.list))
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load subcategories')
      }

      setSubCategories(Array.isArray(data.subCategories) ? data.subCategories : [])
    } catch (err) {
      setError(err.message || 'Unable to load subcategories')
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        })

        const uploadData = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(uploadData.message || 'Unable to upload subcategory image')
        }

        uploadedImageUrl = uploadData?.images?.[0]?.url || ''
      }

      const isEditing = Boolean(editingSubCategoryId)
      const endpoint = isEditing
        ? API_PATHS.subCategories.update.replace(':id', editingSubCategoryId)
        : API_PATHS.subCategories.create

      const response = await fetch(buildApiUrl(endpoint), {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          image: uploadedImageUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create subcategory')
      }

      setFormData({ name: '', description: '', categoryId: '', image: '' })
      setSubCategoryImageFile(null)
      setEditingSubCategoryId('')
      setShowForm(false)
      await fetchSubCategories()
    } catch (err) {
      setError(err.message || 'Unable to save subcategory')
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
    if (!confirm('Are you sure you want to delete this subcategory?')) {
      return
    }

    try {
      const response = await fetch(buildApiUrl(API_PATHS.subCategories.delete.replace(':id', id)), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Unable to delete subcategory')
      }

      await fetchSubCategories()
    } catch (err) {
      setError(err.message)
    }
  }

  const getCategoryName = (id) => {
    if (id && typeof id === 'object' && id.name) {
      return id.name
    }

    const cat = categories.find((c) => c._id === id)
    return cat?.name || 'Unknown'
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Manage Store</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">SubCategories</h2>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Plus size={18} weight="bold" />
          {showForm ? 'Close Form' : 'Add SubCategory'}
        </button>
      </div>

      {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor="category-select">
              Category <span className="text-red-600">*</span>
            </label>
            <select
              id="category-select"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor="subcat-name">
              SubCategory Name <span className="text-red-600">*</span>
            </label>
            <input
              id="subcat-name"
              name="name"
              type="text"
              placeholder="Ex. Fresh Vegetables"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor="subcat-description">
              Description
            </label>
            <textarea
              id="subcat-description"
              name="description"
              placeholder="Optional description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor="subcat-image">
              SubCategory Image
            </label>
            <input
              id="subcat-image"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                setSubCategoryImageFile(file || null)
              }}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <p className="mt-1 text-xs text-slate-500">Optional: upload one image file. Keep empty to retain old image while editing.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingSubCategoryId ? 'Update SubCategory' : 'Create SubCategory'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setFormData({ name: '', description: '', categoryId: '', image: '' })
                setSubCategoryImageFile(null)
                setEditingSubCategoryId('')
              }}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-slate-500">Loading subcategories...</div>
        ) : subCategories.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">No subcategories yet. Create one!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Category</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Description</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {subCategories.map((subCat) => (
                  <tr key={subCat._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{subCat.name}</td>
                    <td className="px-4 py-3 text-slate-600">{getCategoryName(subCat.categoryId)}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-600">{subCat.description}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleEdit(subCat)}
                        className="mr-3 inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(subCat._id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminSubCategories
