import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

function ProductDetailsPage() {
  const navigate = useNavigate()
  const { productId } = useParams()
  const [authUser, setAuthUser] = useState(null)
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeImage, setActiveImage] = useState('')

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
    const fetchProduct = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(buildApiUrl(API_PATHS.products.getById.replace(':id', productId)))
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load product')
        }

        setProduct(data.product || null)
        setActiveImage(data.product?.thumbnail || data.product?.images?.[0] || '')
      } catch (err) {
        setError(err.message || 'Unable to load product')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  const addToCart = () => {
    if (!product || !product.isActive) {
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

  const addToWaitlist = () => {
    if (!product) {
      return
    }

    const waitlistItems = readLocalArray('supermarketWaitlist')
    const alreadyExists = waitlistItems.some((item) => item._id === product._id)

    if (!alreadyExists) {
      waitlistItems.push(product)
      writeLocalArray('supermarketWaitlist', waitlistItems)
    }

    setNotice('Added to waitlist.')
  }

  const isUnavailable = useMemo(() => Boolean(product && !product.isActive), [product])

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading product details...</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        ) : product ? (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="overflow-hidden rounded-2xl bg-emerald-50">
                {activeImage ? (
                  <img src={activeImage} alt={product.name} className={`h-[420px] w-full object-cover ${isUnavailable ? 'opacity-45' : ''}`} />
                ) : (
                  <div className="grid h-[420px] place-items-center text-slate-500">No image</div>
                )}
              </div>
              {Array.isArray(product.images) && product.images.length > 1 ? (
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {product.images.map((image) => (
                    <button key={image} type="button" onClick={() => setActiveImage(image)} className="overflow-hidden rounded-xl border border-slate-200">
                      <img src={image} alt={product.name} className="h-20 w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                {product.categoryId && typeof product.categoryId === 'object' ? product.categoryId.name : 'Uncategorized'}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{product.name}</h1>
              <p className="mt-4 text-sm text-slate-600">{product.description || 'No description available.'}</p>

              <div className="mt-6 flex items-center gap-3">
                <p className="text-3xl font-black text-slate-900">₹{Number(product.price || 0).toFixed(2)}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {product.isActive ? 'Available' : 'Temporary not available'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-700">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unit</p>
                  <p className="mt-1 font-semibold">{product.unit || 'kg'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">SubCategory</p>
                  <p className="mt-1 font-semibold">
                    {product.subCategoryId && typeof product.subCategoryId === 'object'
                      ? product.subCategoryId.name
                      : 'Not assigned'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Discount</p>
                  <p className="mt-1 font-semibold">{product.discount || 0}%</p>
                </div>
              </div>

              {notice ? <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div> : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={!product.isActive}
                  className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={addToWaitlist}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  Add to Waitlist
                </button>
              </div>

              {isUnavailable ? (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  Temporary not available. You can join the waitlist and we will keep you updated.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <Footer />
    </main>
  )
}

export default ProductDetailsPage
