import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'
import Footer from './Footer'
import Navbar from './Navbar'

function CategoryDetailsPage() {
  const navigate = useNavigate()
  const { categoryId } = useParams()
  const [authUser, setAuthUser] = useState(null)
  const [category, setCategory] = useState(null)
  const [subCategories, setSubCategories] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')

    if (!storedUser) {
      return
    }

    try {
      const parsedUser = JSON.parse(storedUser)

      if (parsedUser?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
        return
      }

      if (parsedUser?.role === 'delivery') {
        navigate('/delivery/dashboard', { replace: true })
        return
      }

      setAuthUser(parsedUser)
    } catch (error) {
      localStorage.removeItem('authUser')
      localStorage.removeItem('authToken')
    }
  }, [navigate])

  useEffect(() => {
    const fetchCategoryDetails = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [categoryResponse, subCategoryResponse, productResponse] = await Promise.all([
          fetch(buildApiUrl(API_PATHS.categories.getById.replace(':id', categoryId))),
          fetch(buildApiUrl(API_PATHS.subCategories.getByCategory.replace(':categoryId', categoryId))),
          fetch(buildApiUrl(`${API_PATHS.products.list}?categoryId=${categoryId}`)),
        ])

        const categoryData = await categoryResponse.json()
        const subCategoryData = await subCategoryResponse.json()
        const productData = await productResponse.json()

        if (!categoryResponse.ok) {
          throw new Error(categoryData.message || 'Unable to load category')
        }

        setCategory(categoryData.category || null)
        setSubCategories(Array.isArray(subCategoryData.subCategories) ? subCategoryData.subCategories : [])
        setProducts(Array.isArray(productData.products) ? productData.products : [])
      } catch (err) {
        setError(err.message || 'Unable to load category details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategoryDetails()
  }, [categoryId])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  const categoriesHaveSubCategories = subCategories.length > 0

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading category details...</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        ) : category ? (
          <>
            <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
              <div className="grid gap-0 lg:grid-cols-[420px_1fr]">
                <div className="h-72 bg-emerald-50 lg:h-full">
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-slate-500">No image</div>
                  )}
                </div>
                <div className="p-6 lg:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Category Details</p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{category.name}</h1>
                  <p className="mt-4 max-w-2xl text-sm text-slate-600">{category.description || 'No description available.'}</p>
                </div>
              </div>
            </div>

            {categoriesHaveSubCategories ? (
              <section className="mt-8">
                <div className="mb-4">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Subcategories</h2>
                  <p className="mt-1 text-sm text-slate-600">Choose a subcategory to see its products.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {subCategories.map((subCategory) => (
                    <Link
                      key={subCategory._id}
                      to={`/products?categoryId=${categoryId}&subCategoryId=${subCategory._id}`}
                      className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="h-40 bg-emerald-50">
                        {subCategory.image ? (
                          <img src={subCategory.image} alt={subCategory.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center text-sm text-slate-500">No image</div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-slate-900">{subCategory.name}</h3>
                        <p className="mt-2 text-sm text-slate-600">{subCategory.description || 'No description available.'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : (
              <section className="mt-8">
                <div className="mb-4">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Products</h2>
                  <p className="mt-1 text-sm text-slate-600">This category has no subcategories, so all products are shown here.</p>
                </div>
                {products.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No products found in this category.</div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                      <Link
                        key={product._id}
                        to={`/products/${product._id}`}
                        className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                      >
                        <div className="h-44 bg-emerald-50">
                          {product.thumbnail ? (
                            <img src={product.thumbnail} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center text-sm text-slate-500">No image</div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
                          <p className="mt-2 text-sm text-slate-600">₹{Number(product.price || 0).toFixed(2)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        ) : null}
      </section>

      <Footer />
    </main>
  )
}

export default CategoryDetailsPage
