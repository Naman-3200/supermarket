import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, ShoppingCart, ArrowRight, Share } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function readLocalArray(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
function writeLocalArray(key, value) { localStorage.setItem(key, JSON.stringify(value)) }

function WishlistPage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) { navigate('/login', { replace: true }); return }
    try {
      const parsed = JSON.parse(storedUser)
      if (parsed?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
      if (parsed?.role === 'delivery') { navigate('/delivery/dashboard', { replace: true }); return }
      setAuthUser(parsed)
    } catch { navigate('/login', { replace: true }) }
  }, [navigate])

  const fetchWishlist = () => {
    const token = localStorage.getItem('authToken')
    if (!token) return
    setLoading(true)
    fetch(buildApiUrl(API_PATHS.wishlist.get), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { if (authUser) fetchWishlist() }, [authUser])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
    navigate('/login', { replace: true })
  }

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 2500) }

  const removeFromWishlist = async (productId) => {
    const token = localStorage.getItem('authToken')
    await fetch(buildApiUrl(API_PATHS.wishlist.remove.replace(':productId', productId)), {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    setItems((prev) => prev.filter((i) => i.product?._id !== productId))
    window.dispatchEvent(new Event('wishlistUpdated'))
    flash('Removed from wishlist')
  }

  const addToCart = (product) => {
    if (!product?.isActive) { flash('This product is currently unavailable'); return }
    const cart = readLocalArray('supermarketCart')
    const idx = cart.findIndex((i) => i._id === product._id)
    if (idx >= 0) cart[idx].quantity += 1
    else cart.push({ ...product, quantity: 1 })
    writeLocalArray('supermarketCart', cart)
    window.dispatchEvent(new Event('cartUpdated'))
    flash('Added to cart!')
  }

  const moveAllToCart = () => {
    const availableItems = items.filter((i) => i.product?.isActive)
    if (availableItems.length === 0) { flash('No available items to move'); return }
    const cart = readLocalArray('supermarketCart')
    availableItems.forEach(({ product }) => {
      const idx = cart.findIndex((i) => i._id === product._id)
      if (idx >= 0) cart[idx].quantity += 1
      else cart.push({ ...product, quantity: 1 })
    })
    writeLocalArray('supermarketCart', cart)
    window.dispatchEvent(new Event('cartUpdated'))
    flash(`${availableItems.length} items added to cart!`)
  }

  const shareWishlist = () => {
    const url = window.location.href
    if (navigator.share) { navigator.share({ title: 'My Wishlist – Shubham Supermarket', url }) }
    else { navigator.clipboard.writeText(url).then(() => flash('Wishlist link copied!')) }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Heart size={28} weight="fill" className="text-rose-500" />
              <h1 className="text-3xl font-black tracking-tight text-slate-900">My Wishlist</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
          </div>
          {items.length > 0 && (
            <div className="flex gap-2">
              <button type="button" onClick={moveAllToCart}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                <ShoppingCart size={16} weight="bold" /> Move All to Cart
              </button>
              <button type="button" onClick={shareWishlist}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
                <Share size={16} weight="bold" /> Share
              </button>
            </div>
          )}
        </div>

        {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-3 animate-pulse">
                <div className="aspect-square rounded-xl bg-slate-100" />
                <div className="mt-3 h-4 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Heart size={56} weight="thin" className="mx-auto text-slate-300" />
            <h2 className="mt-5 text-xl font-bold text-slate-900">Your wishlist is empty</h2>
            <p className="mt-2 text-sm text-slate-500">Save products you love and come back to them anytime.</p>
            <Link to="/products" className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Browse Products <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {items.map(({ _id, product, addedAt }) => {
              if (!product) return null
              const discounted = product.discount ? product.price - (product.price * product.discount) / 100 : null
              return (
                <div key={_id} className="group rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md hover:border-emerald-200">
                  <div className="relative">
                    <Link to={`/products/${product._id}`}>
                      <div className="aspect-square overflow-hidden rounded-xl bg-emerald-50">
                        {product.thumbnail
                          ? <img src={product.thumbnail} alt={product.name} className={`h-full w-full object-cover transition group-hover:scale-105 ${!product.isActive ? 'opacity-50' : ''}`} />
                          : <div className="grid h-full place-items-center text-slate-300 text-sm">No image</div>}
                      </div>
                    </Link>
                    {product.discount > 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{product.discount}% OFF</span>
                    )}
                    <button type="button" onClick={() => removeFromWishlist(product._id)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition">
                      <Heart size={14} weight="fill" />
                    </button>
                  </div>
                  <div className="mt-3 px-1">
                    <Link to={`/products/${product._id}`}>
                      <p className="truncate text-sm font-semibold text-slate-800 hover:text-emerald-700">{product.name}</p>
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-400">{product.unit || ''}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        {discounted ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold text-slate-900">₹{discounted.toFixed(0)}</span>
                            <span className="text-[11px] text-slate-400 line-through">₹{product.price}</span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-900">₹{product.price}</span>
                        )}
                      </div>
                      <button type="button" onClick={() => addToCart(product)} disabled={!product.isActive}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                        <ShoppingCart size={14} weight="bold" />
                      </button>
                    </div>
                    {!product.isActive && <p className="mt-1 text-[10px] text-rose-500 font-medium">Currently unavailable</p>}
                    <p className="mt-1 text-[10px] text-slate-400">Added {new Date(addedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

export default WishlistPage
