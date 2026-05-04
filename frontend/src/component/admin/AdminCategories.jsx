import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
  })
  const [categoryImageFile, setCategoryImageFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState('')

  const token = localStorage.getItem('authToken')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(buildApiUrl(API_PATHS.categories.list))
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load categories')
      }

      setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch (err) {
      setError(err.message || 'Unable to load categories')
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
      let imageUrl = formData.image

      if (categoryImageFile) {
        const uploadFormData = new FormData()
        uploadFormData.append('images', categoryImageFile)
        uploadFormData.append('folder', 'supermarket/categories')

        const uploadResponse = await fetch(buildApiUrl(API_PATHS.uploads.images), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        })

        const uploadData = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(uploadData.message || 'Unable to upload category image')
        }

        imageUrl = uploadData?.images?.[0]?.url || ''
      }

      if (!imageUrl) {
        throw new Error('Please upload one category image')
      }

      const isEditing = Boolean(editingCategoryId)
      const endpoint = isEditing
        ? API_PATHS.categories.update.replace(':id', editingCategoryId)
        : API_PATHS.categories.create

      const response = await fetch(buildApiUrl(endpoint), {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          image: imageUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create category')
      }

      setFormData({ name: '', description: '', image: '' })
      setCategoryImageFile(null)
      setEditingCategoryId('')
      setShowForm(false)
      await fetchCategories()
    } catch (err) {
      setError(err.message || 'Unable to save category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (category) => {
    setShowForm(true)
    setEditingCategoryId(category._id)
    setCategoryImageFile(null)
    setFormData({
      name: category.name || '',
      description: category.description || '',
      image: category.image || '',
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return
    }

    try {
      const response = await fetch(buildApiUrl(API_PATHS.categories.delete.replace(':id', id)), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Unable to delete category')
      }

      await fetchCategories()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Manage Store</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Categories</h2>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Plus size={18} weight="bold" />
          {showForm ? 'Close Form' : 'Add Category'}
        </button>
      </div>

      {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor="category-name">
              Category Name <span className="text-red-600">*</span>
            </label>
            <input
              id="category-name"
              name="name"
              type="text"
              placeholder="Ex. Fruits & Vegetables"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor="category-description">
              Description
            </label>
            <textarea
              id="category-description"
              name="description"
              placeholder="Optional description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor="category-image">
              Category Image <span className="text-red-600">*</span>
            </label>
            <input
              id="category-image"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                setCategoryImageFile(file || null)
              }}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <p className="mt-1 text-xs text-slate-500">Upload one image file. Keep empty to retain old image while editing.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Create Category'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setFormData({ name: '', description: '', image: '' })
                setCategoryImageFile(null)
                setEditingCategoryId('')
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
          <div className="px-4 py-8 text-center text-slate-500">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">No categories yet. Create one!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Description</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Image</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{cat.name}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-600">{cat.description}</td>
                    <td className="px-4 py-3">
                      <a href={cat.image} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline text-xs">
                        View
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleEdit(cat)}
                        className="mr-3 inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat._id)}
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

export default AdminCategories
