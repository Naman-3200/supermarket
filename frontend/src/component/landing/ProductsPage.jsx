import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'
import Footer from './Footer'
import Navbar from './Navbar'

function readLocalArray(storageKey) {
  try {
    const rawValue = localStorage.getItem(storageKey)
    return rawValue ? JSON.parse(rawValue) : []
  } catch (error) {
    return []
  }
}

function writeLocalArray(storageKey, value) {
  localStorage.setItem(storageKey, JSON.stringify(value))
}

function ProductsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [authUser, setAuthUser] = useState(null)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const categoryId = searchParams.get('categoryId') || ''
  const subCategoryId = searchParams.get('subCategoryId') || ''

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
    const fetchProducts = async () => {
      setIsLoading(true)
      setError('')

      try {
        const query = new URLSearchParams()

        if (categoryId) {
          query.set('categoryId', categoryId)
        }

        if (subCategoryId) {
          query.set('subCategoryId', subCategoryId)
        }

        const url = query.toString()
          ? `${buildApiUrl(API_PATHS.products.list)}?${query.toString()}`
          : buildApiUrl(API_PATHS.products.list)

        const response = await fetch(url)
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

    fetchProducts()
  }, [categoryId, subCategoryId])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  const addToCart = (product) => {
    if (!product.isActive) {
      setNotice('This product is temporarily not available.')
      return
    }

    const cartItems = readLocalArray('supermarketCart')
    const existingIndex = cartItems.findIndex((item) => item._id === product._id)

    if (existingIndex >= 0) {
      cartItems[existingIndex].quantity += 1
    } else {
      cartItems.push({ ...product, quantity: 1 })
    }

    writeLocalArray('supermarketCart', cartItems)
    setNotice('Product added to cart.')
  }

  const addToWaitlist = (product) => {
    const waitlistItems = readLocalArray('supermarketWaitlist')
    const alreadyExists = waitlistItems.some((item) => item._id === product._id)

    if (!alreadyExists) {
      waitlistItems.push(product)
      writeLocalArray('supermarketWaitlist', waitlistItems)
    }

    setNotice('Added to waitlist.')
  }

  const getStatusLabel = (product) => {
    if (!product.isActive) return 'Temporary not available'
    return 'Available'
  }

  const getDiscountedPrice = (product) => {
    const price = Number(product.price || 0)
    const discount = Number(product.discount || 0)
    if (!discount) return null
    if (product.discountType === 'flat') return Math.max(0, price - discount)
    return price * (1 - discount / 100)
  }

  const filteredProducts = useMemo(() => products, [products])

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Explore Store</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {categoryId || subCategoryId ? 'Filtered Products' : 'All Products'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Click a product to open complete details. Add to cart or waitlist from here too.
            </p>
          </div>
        </div>

        {notice ? <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div> : null}
        {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No products found.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <article key={product._id} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <Link to={`/products/${product._id}`} className="block">
                  <div className="relative h-48 bg-emerald-50">
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt={product.name} className={`h-full w-full object-cover ${product.isActive ? '' : 'opacity-45'}`} />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-slate-500">No image</div>
                    )}
                    <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white ${product.isActive ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                      {getStatusLabel(product)}
                    </span>
                  </div>
                </Link>

                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    {product.categoryId && typeof product.categoryId === 'object' ? product.categoryId.name : 'Uncategorized'}
                  </p>
                  <Link to={`/products/${product._id}`}>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">{product.name}</h2>
                  </Link>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{product.description || 'No description available.'}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      {getDiscountedPrice(product) === null ? (
                        <p className="text-xl font-black text-slate-900">₹{Number(product.price || 0).toFixed(2)}</p>
                      ) : (
                        <>
                          <p className="text-xl font-black text-slate-900">₹{getDiscountedPrice(product).toFixed(2)}</p>
                          <p className="text-xs text-slate-400 line-through">₹{Number(product.price || 0).toFixed(2)}</p>
                        </>
                      )}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {getStatusLabel(product)}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      disabled={!product.isActive}
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      onClick={() => addToWaitlist(product)}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      Waitlist
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

export default ProductsPage
