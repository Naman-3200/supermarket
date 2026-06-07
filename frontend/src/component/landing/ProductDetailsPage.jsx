import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Heart, ShoppingCart, Star, ArrowLeft, Share } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'
import Footer from './Footer'
import Navbar from './Navbar'

function readLocalArray(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
function writeLocalArray(key, value) { localStorage.setItem(key, JSON.stringify(value)) }

function calcDiscountedPrice(product) {
  if (!product?.discount) return null
  const price = Number(product.price || 0)
  const discount = Number(product.discount)
  if (product.discountType === 'flat') return Math.max(0, price - discount)
  return price * (1 - discount / 100)
}

function discountLabel(product) {
  return product.discountType === 'flat' ? `₹${product.discount} OFF` : `${product.discount}% OFF`
}

function StarRating({ value, onChange, size = 20 }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange?.(n)} onMouseEnter={() => onChange && setHovered(n)} onMouseLeave={() => setHovered(0)} className={onChange ? 'cursor-pointer' : 'cursor-default'}>
          <Star size={size} weight={n <= active ? 'fill' : 'regular'} className={n <= active ? 'text-amber-400' : 'text-slate-300'} />
        </button>
      ))}
    </div>
  )
}

function ReviewSection({ productId, authUser }) {
  const [reviews, setReviews] = useState([])
  const [avg, setAvg] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [myReview, setMyReview] = useState(null)
  const [form, setForm] = useState({ rating: 5, comment: '', deliveryRating: 0 })
  const [submitting, setSubmitting] = useState(false)

  const fetchReviews = () => {
    fetch(buildApiUrl(API_PATHS.reviews.byProduct.replace(':productId', productId)))
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews || [])
        setAvg(d.averageRating || 0)
        setTotal(d.totalReviews || 0)
        if (authUser) {
          const mine = (d.reviews || []).find((r) => r.userId?._id === authUser.id || r.userId === authUser.id)
          setMyReview(mine || null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReviews() }, [productId])

  const submitReview = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) return
    setSubmitting(true)
    try {
      const res = await fetch(buildApiUrl(API_PATHS.reviews.create), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, ...form }),
      })
      if (res.ok) { fetchReviews(); setShowForm(false) }
    } finally {
      setSubmitting(false)
    }
  }

  const deleteReview = async (id) => {
    const token = localStorage.getItem('authToken')
    if (!token) return
    await fetch(buildApiUrl(API_PATHS.reviews.delete.replace(':id', id)), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchReviews()
    setMyReview(null)
  }

  return (
    <div className="mt-8 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Ratings & Reviews</h2>
          {total > 0 && (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-4xl font-black text-slate-900">{avg.toFixed(1)}</span>
              <div>
                <StarRating value={Math.round(avg)} />
                <p className="mt-0.5 text-xs text-slate-500">{total} review{total !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
        {authUser && !myReview && !showForm && (
          <button type="button" onClick={() => setShowForm(true)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
            Write a Review
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="mb-3 text-sm font-semibold text-slate-700">Your Rating</p>
          <StarRating value={form.rating} onChange={(r) => setForm((p) => ({ ...p, rating: r }))} size={24} />
          <textarea
            value={form.comment}
            onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
            placeholder="Share your experience with this product…"
            rows={3}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <p className="mt-3 mb-1 text-sm font-semibold text-slate-700">Delivery Rating (optional)</p>
          <StarRating value={form.deliveryRating} onChange={(r) => setForm((p) => ({ ...p, deliveryRating: r }))} size={20} />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={submitReview} disabled={submitting} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-4 text-center text-sm text-slate-400">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          No reviews yet. Be the first to share your experience!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r._id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {r.userId?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{r.userId?.username || 'Anonymous'}</p>
                    <StarRating value={r.rating} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  {(r.userId?._id === authUser?.id || r.userId === authUser?.id) && (
                    <button type="button" onClick={() => deleteReview(r._id)} className="text-xs text-rose-500 hover:text-rose-700">Delete</button>
                  )}
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
              {r.deliveryRating && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span>Delivery:</span>
                  <StarRating value={r.deliveryRating} size={12} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProductDetailsPage() {
  const navigate = useNavigate()
  const { productId } = useParams()
  const [authUser, setAuthUser] = useState(null)
  const [product, setProduct] = useState(null)
  const [similar, setSimilar] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeImage, setActiveImage] = useState('')
  const [inWishlist, setInWishlist] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) return
    try {
      const parsedUser = JSON.parse(storedUser)
      if (parsedUser?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
      if (parsedUser?.role === 'delivery') { navigate('/delivery/dashboard', { replace: true }); return }
      setAuthUser(parsedUser)
    } catch {
      localStorage.removeItem('authUser')
      localStorage.removeItem('authToken')
    }
  }, [navigate])

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true)
      setError('')
      try {
        const res = await fetch(buildApiUrl(API_PATHS.products.getById.replace(':id', productId)))
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Unable to load product')
        setProduct(data.product || null)
        setActiveImage(data.product?.thumbnail || data.product?.images?.[0] || '')

        // Fetch similar products (same category)
        if (data.product?.categoryId) {
          const catId = typeof data.product.categoryId === 'object' ? data.product.categoryId._id : data.product.categoryId
          fetch(buildApiUrl(`${API_PATHS.products.list}?categoryId=${catId}&limit=6`))
            .then((r) => r.json())
            .then((d) => setSimilar((d.products || []).filter((p) => p._id !== productId).slice(0, 4)))
            .catch(() => {})
        }
      } catch (err) {
        setError(err.message || 'Unable to load product')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProduct()
  }, [productId])

  // Check wishlist
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token || !product) return
    fetch(buildApiUrl(API_PATHS.wishlist.get), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const inList = (d.items || []).some((i) => i.product?._id === product._id)
        setInWishlist(inList)
      })
      .catch(() => {})
  }, [product])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  const addToCart = () => {
    if (!product?.isActive) { setNotice('This product is temporarily not available.'); return }
    const cart = readLocalArray('supermarketCart')
    const idx = cart.findIndex((i) => i._id === product._id)
    if (idx >= 0) cart[idx].quantity += 1
    else cart.push({ ...product, quantity: 1 })
    writeLocalArray('supermarketCart', cart)
    window.dispatchEvent(new Event('cartUpdated'))
    setNotice('Added to cart!')
    setTimeout(() => setNotice(''), 2000)
  }

  const toggleWishlist = async () => {
    if (!authUser) { navigate('/login'); return }
    const token = localStorage.getItem('authToken')
    setWishlistLoading(true)
    try {
      if (inWishlist) {
        await fetch(buildApiUrl(API_PATHS.wishlist.remove.replace(':productId', product._id)), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        setInWishlist(false)
        setNotice('Removed from wishlist')
      } else {
        await fetch(buildApiUrl(API_PATHS.wishlist.add), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId: product._id }),
        })
        setInWishlist(true)
        setNotice('Added to wishlist!')
      }
      window.dispatchEvent(new Event('wishlistUpdated'))
    } catch {
      setNotice('Something went wrong.')
    } finally {
      setWishlistLoading(false)
      setTimeout(() => setNotice(''), 2000)
    }
  }

  const shareProduct = () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: product?.name, url })
    } else {
      navigator.clipboard.writeText(url).then(() => setNotice('Link copied!'))
    }
    setTimeout(() => setNotice(''), 2000)
  }

  const discountedPrice = calcDiscountedPrice(product)

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Link to="/products" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700">
          <ArrowLeft size={16} weight="bold" /> Back to Products
        </Link>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-500">Loading product…</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
        ) : product ? (
          <>
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Image gallery */}
              <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="overflow-hidden rounded-2xl bg-emerald-50">
                  {activeImage ? (
                    <img src={activeImage} alt={product.name} className={`h-[380px] w-full object-cover ${!product.isActive ? 'opacity-50' : ''}`} />
                  ) : (
                    <div className="grid h-[380px] place-items-center text-slate-400">No image</div>
                  )}
                </div>
                {Array.isArray(product.images) && product.images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {product.images.map((img) => (
                      <button key={img} type="button" onClick={() => setActiveImage(img)}
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${activeImage === img ? 'border-emerald-500' : 'border-transparent'}`}>
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product info */}
              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                  {typeof product.categoryId === 'object' ? product.categoryId?.name : 'Uncategorized'}
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{product.name}</h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{product.description || 'No description available.'}</p>

                <div className="mt-5 flex items-center gap-3">
                  {discountedPrice ? (
                    <>
                      <span className="text-3xl font-black text-slate-900">₹{discountedPrice.toFixed(2)}</span>
                      <span className="text-lg text-slate-400 line-through">₹{product.price}</span>
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                        {discountLabel(product)}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-black text-slate-900">₹{product.price}</span>
                  )}
                  <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {product.isActive ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Unit', product.unit || '—'],
                    ['Category', typeof product.categoryId === 'object' ? product.categoryId?.name : '—'],
                    ['SubCategory', typeof product.subCategoryId === 'object' ? product.subCategoryId?.name : '—'],
                    ['SKU', product.sku || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>

                {notice && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>
                )}

                {!product.isActive && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    This item is temporarily unavailable. Add to wishlist to get notified.
                  </div>
                )}

                <div className="mt-5 flex gap-2">
                  <button type="button" onClick={addToCart} disabled={!product.isActive}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                    <ShoppingCart size={18} weight="bold" />
                    Add to Cart
                  </button>
                  <button type="button" onClick={toggleWishlist} disabled={wishlistLoading}
                    className={`flex items-center justify-center rounded-xl border-2 px-4 py-3 transition ${inWishlist ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-500'}`}>
                    <Heart size={18} weight={inWishlist ? 'fill' : 'regular'} />
                  </button>
                  <button type="button" onClick={shareProduct}
                    className="flex items-center justify-center rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600">
                    <Share size={18} weight="bold" />
                  </button>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <ReviewSection productId={productId} authUser={authUser} />

            {/* Similar products */}
            {similar.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 text-xl font-bold text-slate-900">Similar Products</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {similar.map((p) => (
                    <Link key={p._id} to={`/products/${p._id}`} className="group rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-emerald-200 hover:shadow-md">
                      <div className="aspect-square overflow-hidden rounded-xl bg-emerald-50">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                        ) : (
                          <div className="grid h-full place-items-center text-slate-300">No img</div>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-slate-800">{p.name}</p>
                      <p className="mt-0.5 text-sm font-bold text-emerald-700">₹{p.price}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </section>

      <Footer />
    </main>
  )
}

export default ProductDetailsPage
