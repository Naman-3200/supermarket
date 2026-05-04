import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function AdminProducts() {
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discount: '',
    unit: 'kg',
    categoryId: '',
    subCategoryId: '',
    isActive: true,
  })
  const [productImageFiles, setProductImageFiles] = useState([])
  const [existingImageUrls, setExistingImageUrls] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingProductId, setEditingProductId] = useState('')

  const token = localStorage.getItem('authToken')

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch(buildApiUrl(API_PATHS.categories.list))
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load categories')
      }

      setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch (err) {
      setError(err.message || 'Unable to load categories')
    }
  }

  const fetchSubCategories = async (categoryId) => {
    if (!categoryId) {
      setSubCategories([])
      return
    }

    try {
      const response = await fetch(buildApiUrl(API_PATHS.subCategories.getByCategory.replace(':categoryId', categoryId)))
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load subcategories')
      }

      setSubCategories(Array.isArray(data.subCategories) ? data.subCategories : [])
    } catch (err) {
      setError(err.message || 'Unable to load subcategories')
      setSubCategories([])
    }
  }

  const fetchProducts = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(buildApiUrl(API_PATHS.products.list))
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load products')
      }

      setProducts(Array.isArray(data.products) ? data.products : [])
    } catch (err) {
      setError(err.message || 'Unable to load products')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((prev) => {
      if (name === 'categoryId') {
        fetchSubCategories(value)
        return {
          ...prev,
          categoryId: value,
          subCategoryId: '',
        }
      }

      return {
        ...prev,
        [name]: value,
      }
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        })

        const uploadData = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(uploadData.message || 'Unable to upload product images')
        }

        uploadedImageUrls = Array.isArray(uploadData?.images)
          ? uploadData.images.map((image) => image.url).filter(Boolean)
          : []
      }

      if (!uploadedImageUrls.length) {
        throw new Error('Please upload at least one product image')
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        discount: parseFloat(formData.discount) || 0,
        unit: formData.unit,
        categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId || undefined,
        isActive: formData.isActive,
        images: uploadedImageUrls,
      }

      const endpoint = editingProductId
        ? API_PATHS.products.update.replace(':id', editingProductId)
        : API_PATHS.products.create

      const response = await fetch(buildApiUrl(endpoint), {
        method: editingProductId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to save product')
      }

      setFormData({
        name: '',
        description: '',
        price: '',
        discount: '',
        unit: 'kg',
        categoryId: '',
        subCategoryId: '',
        isActive: true,
      })
      setProductImageFiles([])
      setExistingImageUrls([])
      setEditingProductId('')
      setShowForm(false)
      await fetchProducts()
    } catch (err) {
      setError(err.message || 'Unable to save product')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (product) => {
    const categoryId = product.categoryId && typeof product.categoryId === 'object' ? product.categoryId._id : product.categoryId || ''
    const subCategoryId = product.subCategoryId && typeof product.subCategoryId === 'object' ? product.subCategoryId._id : product.subCategoryId || ''

    setShowForm(true)
    setEditingProductId(product._id)
    setProductImageFiles([])
    setExistingImageUrls(Array.isArray(product.images) ? product.images : [])
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      discount: product.discount ?? '',
      unit: product.unit || 'kg',
      categoryId,
      subCategoryId,
      isActive: product.isActive ?? true,
    })

    await fetchSubCategories(categoryId)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      const response = await fetch(buildApiUrl(API_PATHS.products.delete.replace(':id', id)), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Unable to delete product')
      }

      await fetchProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const getCategoryName = (id) => {
    if (id && typeof id === 'object' && id.name) {
      return id.name
    }

    const category = categories.find((item) => item._id === id)
    return category?.name || 'Unknown'
  }

  const toggleStatus = async (product) => {
    try {
      const response = await fetch(buildApiUrl(API_PATHS.products.update.replace(':id', product._id)), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !product.isActive }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to update product status')
      }

      await fetchProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Manage Store</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Products</h2>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Plus size={18} weight="bold" />
          {showForm ? 'Close Form' : 'Add Product'}
        </button>
      </div>

      {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

      {showForm ? (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-800" htmlFor="product-name">
                Product Name <span className="text-red-600">*</span>
              </label>
              <input
                id="product-name"
                name="name"
                type="text"
                placeholder="Ex. Fresh Tomatoes"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-800" htmlFor="product-unit">
                Unit <span className="text-red-600">*</span>
              </label>
              <input
                id="product-unit"
                name="unit"
                type="text"
                placeholder="Ex. kg, liter, piece"
                value={formData.unit}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

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
              <label className="text-sm font-semibold text-gray-800" htmlFor="subcategory-select">
                SubCategory (Optional)
              </label>
              <select
                id="subcategory-select"
                name="subCategoryId"
                value={formData.subCategoryId}
                onChange={handleChange}
                disabled={!formData.categoryId}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-100"
              >
                <option value="">
                  {formData.categoryId ? 'No subcategory' : 'Select category first'}
                </option>
                {subCategories.map((subCat) => (
                  <option key={subCat._id} value={subCat._id}>
                    {subCat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-800" htmlFor="product-price">
                Price <span className="text-red-600">*</span>
              </label>
              <input
                id="product-price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex. 100"
                value={formData.price}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-800" htmlFor="product-discount">
                Discount (%)
              </label>
              <input
                id="product-discount"
                name="discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex. 10"
                value={formData.discount}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-800" htmlFor="product-status">
                Status
              </label>
              <select
                id="product-status"
                name="isActive"
                value={String(formData.isActive)}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: event.target.value === 'true',
                  }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor="product-description">
              Description
            </label>
            <textarea
              id="product-description"
              name="description"
              placeholder="Optional product description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor="product-images">
              Product Images <span className="text-red-600">*</span>
            </label>
            <input
              id="product-images"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files || [])
                setProductImageFiles(files.slice(0, 5))
              }}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <p className="mt-1 text-xs text-slate-500">
              Upload 1 to 5 images. First uploaded image becomes the product thumbnail. Leave empty while editing to keep the current images.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setFormData({
                  name: '',
                  description: '',
                  price: '',
                  discount: '',
                  unit: 'kg',
                  categoryId: '',
                  subCategoryId: '',
                  isActive: true,
                })
                setProductImageFiles([])
                setExistingImageUrls([])
                setEditingProductId('')
                setSubCategories([])
              }}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-slate-500">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">No products yet. Create one!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Thumbnail</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Category</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Price</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {product.thumbnail ? (
                        <img src={product.thumbnail} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <span className="text-xs text-slate-500">No image</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-slate-600">{getCategoryName(product.categoryId)}</td>
                    <td className="px-4 py-3 text-slate-600">₹{Number(product.price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleStatus(product)}
                        className={`mr-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                          product.isActive ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {product.isActive ? 'Turn Off' : 'Turn On'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(product)}
                        className="mr-3 inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product._id)}
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

export default AdminProducts
