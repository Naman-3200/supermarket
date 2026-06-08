import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash, Plus, Minus, ArrowRight, Heart, Tag } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const MIN_ORDER = 99

function readLocalArray(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
function writeLocalArray(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function dispatchCartEvent() { window.dispatchEvent(new Event('cartUpdated')) }

function CartPage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [savedItems, setSavedItems] = useState([])
  const [notice, setNotice] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponData, setCouponData] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [deliverySettings, setDeliverySettings] = useState({ deliveryCharge: 40, freeDeliveryThreshold: 499, freeDeliveryEnabled: true })

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) return
    try {
      const parsed = JSON.parse(storedUser)
      if (parsed?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
      if (parsed?.role === 'delivery') { navigate('/delivery/dashboard', { replace: true }); return }
      setAuthUser(parsed)
    } catch {
      localStorage.removeItem('authUser')
      localStorage.removeItem('authToken')
    }
  }, [navigate])

  useEffect(() => {
    fetch(buildApiUrl(API_PATHS.settings.get))
      .then((r) => r.json())
      .then((d) => setDeliverySettings({
        deliveryCharge: d.deliveryCharge ?? 40,
        freeDeliveryThreshold: d.freeDeliveryThreshold ?? 499,
        freeDeliveryEnabled: d.freeDeliveryEnabled !== false,
      }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setCartItems(readLocalArray('supermarketCart'))
    setSavedItems(readLocalArray('supermarketSaved'))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  const syncCart = (next, msg) => {
    setCartItems(next)
    writeLocalArray('supermarketCart', next)
    dispatchCartEvent()
    if (msg) { setNotice(msg); setTimeout(() => setNotice(''), 2500) }
  }

  const syncSaved = (next) => {
    setSavedItems(next)
    writeLocalArray('supermarketSaved', next)
  }

  const updateQuantity = (id, delta) => {
    const next = cartItems.map((item) =>
      item._id === id ? { ...item, quantity: Math.max(1, Number(item.quantity || 1) + delta) } : item,
    )
    syncCart(next, '')
  }

  const removeItem = (id) => syncCart(cartItems.filter((i) => i._id !== id), 'Item removed.')

  const saveForLater = (id) => {
    const item = cartItems.find((i) => i._id === id)
    if (!item) return
    syncCart(cartItems.filter((i) => i._id !== id), 'Saved for later.')
    const alreadySaved = savedItems.some((i) => i._id === id)
    if (!alreadySaved) syncSaved([...savedItems, { ...item, quantity: 1 }])
  }

  const moveToCart = (id) => {
    const item = savedItems.find((i) => i._id === id)
    if (!item) return
    syncSaved(savedItems.filter((i) => i._id !== id))
    const idx = cartItems.findIndex((i) => i._id === id)
    if (idx >= 0) {
      const next = [...cartItems]
      next[idx].quantity += 1
      syncCart(next, 'Moved to cart.')
    } else {
      syncCart([...cartItems, { ...item, quantity: 1 }], 'Moved to cart.')
    }
  }

  const removeSaved = (id) => syncSaved(savedItems.filter((i) => i._id !== id))

  const getEffectivePrice = (item) => {
    const price = Number(item.price || 0)
    const discount = Number(item.discount || 0)
    if (!discount) return price
    if (item.discountType === 'flat') return Math.max(0, price - discount)
    return price * (1 - discount / 100)
  }

  const subtotal = useMemo(
    () => cartItems.reduce((t, i) => t + getEffectivePrice(i) * Number(i.quantity || 1), 0),
    [cartItems],
  )

  const deliveryCharge = useMemo(() => {
    if (cartItems.length === 0) return 0
    if (!deliverySettings.freeDeliveryEnabled) return 0
    if (subtotal >= deliverySettings.freeDeliveryThreshold) return 0
    return deliverySettings.deliveryCharge
  }, [deliverySettings, subtotal, cartItems.length])

  const couponDiscount = useMemo(() => {
    if (!couponData) return 0
    if (couponData.discountType === 'percentage') return parseFloat(((subtotal * couponData.discountValue) / 100).toFixed(2))
    if (couponData.discountType === 'fixed') return Math.min(couponData.discountValue, subtotal)
    if (couponData.discountType === 'free_delivery') return deliveryCharge
    return 0
  }, [couponData, subtotal, deliveryCharge])

  const total = Math.max(0, subtotal + deliveryCharge - couponDiscount)

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.coupons.validate), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), orderAmount: subtotal }),
      })
      const data = await res.json()
      if (!res.ok) { setCouponError(data.message || 'Invalid coupon'); setCouponData(null) }
      else { setCouponData(data.coupon); setCouponError('') }
    } catch {
      setCouponError('Failed to validate coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => { setCouponData(null); setCouponCode(''); setCouponError('') }

  const itemCount = cartItems.reduce((t, i) => t + Number(i.quantity || 1), 0)
  const belowMinimum = subtotal < MIN_ORDER && cartItems.length > 0

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Shopping</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">My Cart</h1>
          </div>
          {cartItems.length > 0 && (
            <button type="button" onClick={() => syncCart([], 'Cart cleared.')}
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-600">
              Clear Cart
            </button>
          )}
        </div>

        {notice && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>
        )}

        {belowMinimum && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Minimum order amount is <strong>₹{MIN_ORDER}</strong>. Add ₹{(MIN_ORDER - subtotal).toFixed(0)} more to proceed.
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">🛒</div>
            <h2 className="text-xl font-bold text-slate-900">Your cart is empty</h2>
            <p className="mt-2 text-sm text-slate-500">Browse products and add items you want to buy.</p>
            <Link to="/products" className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Browse Products <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Cart items */}
            <div className="space-y-3">
              {cartItems.map((item) => (
                <article key={item._id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="grid gap-3 p-4 sm:grid-cols-[100px_1fr_auto] sm:items-center">
                    <Link to={`/products/${item._id}`} className="block h-24 w-full overflow-hidden rounded-xl bg-emerald-50 sm:h-24">
                      {item.thumbnail
                        ? <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                        : <div className="grid h-full place-items-center text-slate-300 text-xs">No image</div>}
                    </Link>
                    <div>
                      <Link to={`/products/${item._id}`}>
                        <p className="font-bold text-slate-900 hover:text-emerald-700">{item.name}</p>
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">{item.unit || ''}</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-700">
                        ₹{getEffectivePrice(item).toFixed(2)} each
                        {Number(item.discount || 0) > 0 && (
                          <span className="ml-1 text-xs text-slate-400 line-through font-normal">₹{Number(item.price || 0).toFixed(2)}</span>
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" onClick={() => saveForLater(item._id)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-emerald-700">
                          <Heart size={12} weight="bold" /> Save for later
                        </button>
                        <button type="button" onClick={() => removeItem(item._id)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600">
                          <Trash size={12} weight="bold" /> Remove
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-base font-black text-slate-900">
                        ₹{(getEffectivePrice(item) * Number(item.quantity || 1)).toFixed(2)}
                      </p>
                      <div className="flex items-center rounded-full border border-slate-200 bg-slate-50">
                        <button type="button" onClick={() => updateQuantity(item._id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-white hover:text-emerald-700">
                          <Minus size={13} weight="bold" />
                        </button>
                        <span className="min-w-8 px-2 text-center text-sm font-bold text-slate-900">{item.quantity || 1}</span>
                        <button type="button" onClick={() => updateQuantity(item._id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-white hover:text-emerald-700">
                          <Plus size={13} weight="bold" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Summary */}
            <aside className="h-fit space-y-4">
              {/* Coupon */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Tag size={16} weight="bold" className="text-emerald-600" /> Apply Coupon
                </p>
                {couponData ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-bold text-emerald-700">{couponData.code}</p>
                      <p className="text-xs text-emerald-600">–₹{couponDiscount.toFixed(2)} discount</p>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      placeholder="Enter coupon code"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm uppercase tracking-wider focus:border-emerald-400 focus:outline-none"
                    />
                    <button type="button" onClick={applyCoupon} disabled={couponLoading}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                      {couponLoading ? '…' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && <p className="mt-1.5 text-xs text-rose-600">{couponError}</p>}
              </div>

              {/* Price breakdown */}
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="mb-4 text-sm font-bold text-slate-900">Order Summary</p>
                <div className="space-y-2.5 text-sm">
                  {[
                    ['Items', `${itemCount} item${itemCount !== 1 ? 's' : ''}`],
                    ['Subtotal', `₹${subtotal.toFixed(2)}`],
                    ['Delivery', deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`],
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-slate-600">{label}</span>
                      <span className={`font-semibold ${val === 'Free' ? 'text-emerald-700' : 'text-slate-900'}`}>{val}</span>
                    </div>
                  ))}
                  {couponDiscount > 0 && (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>Coupon ({couponData?.code})</span>
                      <span className="font-semibold">–₹{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {deliverySettings.freeDeliveryEnabled && subtotal < deliverySettings.freeDeliveryThreshold && subtotal > 0 && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Add ₹{(deliverySettings.freeDeliveryThreshold - subtotal).toFixed(0)} more for free delivery!
                    </p>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-base font-black text-slate-900">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>

                <button type="button" disabled={belowMinimum}
                  onClick={() => {
                    if (!authUser) { navigate('/login'); return }
                    const params = new URLSearchParams()
                    if (couponData) { params.set('coupon', couponData.code); params.set('couponDiscount', couponDiscount.toFixed(2)) }
                    navigate(`/checkout?${params.toString()}`)
                  }}
                  className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                  {belowMinimum ? `Add ₹${(MIN_ORDER - subtotal).toFixed(0)} more` : 'Proceed to Checkout'}
                </button>
                <Link to="/products" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
                  Continue Shopping <ArrowRight size={14} weight="bold" />
                </Link>
              </div>
            </aside>
          </div>
        )}

        {/* Saved for later */}
        {savedItems.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Saved for Later ({savedItems.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedItems.map((item) => (
                <div key={item._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                      {item.thumbnail
                        ? <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                        : <div className="grid h-full place-items-center text-slate-300 text-xs">No img</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-slate-800">{item.name}</p>
                      <p className="text-sm text-emerald-700 font-bold">₹{item.price}</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => moveToCart(item._id)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">Move to Cart</button>
                        <button type="button" onClick={() => removeSaved(item._id)}
                          className="text-xs font-semibold text-slate-400 hover:text-rose-600">Remove</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

export default CartPage
