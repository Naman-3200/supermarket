import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ShoppingCart, Star } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function dispatchCartEvent() {
  window.dispatchEvent(new Event('cartUpdated'))
}

function readLocalArray(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}

function writeLocalArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function ProductCard({ product }) {
  const [added, setAdded] = useState(false)

  const addToCart = () => {
    if (!product.isActive) return
    const cart = readLocalArray('supermarketCart')
    const idx = cart.findIndex((i) => i._id === product._id)
    if (idx >= 0) cart[idx].quantity += 1
    else cart.push({ ...product, quantity: 1 })
    writeLocalArray('supermarketCart', cart)
    dispatchCartEvent()
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const discountedPrice = product.discount
    ? product.price - (product.price * product.discount) / 100
    : null

  return (
    <div className="group rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md hover:border-emerald-200">
      <Link to={`/products/${product._id}`}>
        <div className="relative overflow-hidden rounded-xl bg-emerald-50 aspect-square">
          {product.thumbnail ? (
            <img src={product.thumbnail} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <div className="grid h-full place-items-center text-slate-300 text-sm">No image</div>
          )}
          {product.discount > 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {product.discount}% OFF
            </span>
          )}
          {!product.isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Unavailable</span>
            </div>
          )}
        </div>
      </Link>
      <div className="mt-3 px-1">
        <Link to={`/products/${product._id}`}>
          <p className="truncate text-sm font-semibold text-slate-800 hover:text-emerald-700">{product.name}</p>
        </Link>
        <p className="mt-0.5 text-xs text-slate-400">{product.unit || ''}</p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            {discountedPrice ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-slate-900">₹{discountedPrice.toFixed(0)}</span>
                <span className="text-xs text-slate-400 line-through">₹{product.price}</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-slate-900">₹{product.price}</span>
            )}
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={!product.isActive}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              added
                ? 'bg-emerald-600 text-white'
                : product.isActive
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                : 'border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
            }`}
          >
            <ShoppingCart size={15} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  )
}

function LandingPage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [categories, setCategories] = useState([])
  const [recommended, setRecommended] = useState([])
  const [featuredLoading, setFeaturedLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        if (parsedUser?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
        if (parsedUser?.role === 'delivery') { navigate('/delivery/dashboard', { replace: true }); return }
        setAuthUser(parsedUser)
      } catch {
        localStorage.removeItem('authUser')
        localStorage.removeItem('authToken')
      }
    }
  }, [navigate])

  useEffect(() => {
    fetch(buildApiUrl(API_PATHS.categories.list))
      .then((r) => r.json())
      .then((d) => setCategories((d.categories || []).slice(0, 8)))
      .catch(() => {})

    fetch(buildApiUrl(`${API_PATHS.products.list}?limit=8&sort=discount`))
      .then((r) => r.json())
      .then((d) => {
        setRecommended((d.products || []).filter((p) => p.isActive).slice(0, 8))
        setFeaturedLoading(false)
      })
      .catch(() => setFeaturedLoading(false))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-12 pt-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:pt-16">
        <div>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Fresh groceries delivered fast
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
            Your neighborhood supermarket, now online.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            Shop fruits, vegetables, dairy, snacks, and daily essentials from Shubham Supermarket with easy ordering and same-day doorstep delivery.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/products" className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700">
              Start Shopping
            </Link>
            <Link to="/categories" className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
              Browse Categories
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-600">
            {[['🚀', 'Fast Delivery'], ['💰', 'Best Prices'], ['✅', 'Fresh Quality'], ['🔒', 'Secure Payments']].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-100/60">
          <h2 className="text-lg font-bold text-slate-900">Today's Highlights</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              { color: 'emerald', tag: 'Farm Fresh', title: 'Vegetable Combo', desc: 'Up to 25% off' },
              { color: 'lime', tag: 'Daily Essentials', title: 'Milk, Bread, Eggs', desc: 'Delivered in 30 mins' },
              { color: 'amber', tag: 'Snacks', title: 'Tea-time Favorites', desc: 'Buy 1 Get 1 offers' },
              { color: 'cyan', tag: 'Member Deals', title: 'Extra 10% Savings', desc: 'On first online order' },
            ].map(({ color, tag, title, desc }) => (
              <div key={title} className={`rounded-2xl bg-${color}-50 p-4`}>
                <p className={`text-xs font-semibold uppercase tracking-wide text-${color}-700`}>{tag}</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{title}</p>
                <p className="mt-1 text-sm text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900">Shop by Category</h2>
            <Link to="/categories" className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              View all <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
            {categories.map((cat) => (
              <Link key={cat._id} to={`/categories/${cat._id}`} className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-center transition hover:border-emerald-200 hover:shadow-md">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-emerald-50">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-2xl">🛒</div>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700 leading-tight">{cat.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommended */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Recommended for You</h2>
            <p className="mt-1 text-sm text-slate-500">Best deals and top-rated products</p>
          </div>
          <Link to="/products" className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            See all <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
        {featuredLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-3 animate-pulse">
                <div className="aspect-square rounded-xl bg-slate-100" />
                <div className="mt-3 h-4 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : recommended.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {recommended.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
            Products will appear here once they are added to the store.
          </div>
        )}
      </section>

      {/* Trust Banner */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-10 text-white">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: '🚚', title: 'Free Delivery', desc: 'On orders above ₹499' },
              { icon: '🔄', title: 'Easy Returns', desc: '7-day return window' },
              { icon: '🛡️', title: 'Secure Payment', desc: 'Multiple payment options' },
              { icon: '⭐', title: '24/7 Support', desc: 'We are always here to help' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4">
                <span className="text-3xl">{icon}</span>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="text-sm text-emerald-100">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

export default LandingPage
