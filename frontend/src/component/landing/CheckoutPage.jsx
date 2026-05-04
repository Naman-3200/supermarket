import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Truck, CreditCard, CheckCircle, X, LockKey, ArrowLeft } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function PaymentModal({ amount, onSuccess, onClose }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' })
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState({})

  const formatCardNumber = (val) =>
    val
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(.{4})/g, '$1 ')
      .trim()

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4)
    return digits.length >= 3 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits
  }

  const validate = () => {
    const e = {}
    if (card.number.replace(/\s/g, '').length !== 16) e.number = 'Enter a valid 16-digit card number'
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) e.expiry = 'Enter expiry as MM/YY'
    if (card.cvv.length < 3) e.cvv = 'Enter valid CVV'
    if (!card.name.trim()) e.name = 'Enter name on card'
    return e
  }

  const handlePay = () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setSuccess(true)
      setTimeout(onSuccess, 1400)
    }, 2000)
  }

  const field = (key) => ({
    value: card[key],
    onChange: (e) => {
      let val = e.target.value
      if (key === 'number') val = formatCardNumber(val)
      if (key === 'expiry') val = formatExpiry(val)
      if (key === 'cvv') val = val.replace(/\D/g, '').slice(0, 4)
      setCard((p) => ({ ...p, [key]: val }))
      setErrors((p) => ({ ...p, [key]: '' }))
    },
  })

  const inputClass = (key) =>
    `w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition ${
      errors[key] ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
    }`

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl bg-white p-10 text-center shadow-2xl">
          <CheckCircle size={72} weight="fill" className="mx-auto text-emerald-500" />
          <h2 className="mt-5 text-2xl font-black text-slate-900">Payment Successful!</h2>
          <p className="mt-2 text-sm text-slate-500">Placing your order…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Secure Payment</h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <LockKey size={12} weight="bold" /> SSL encrypted · Safe checkout
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Card Number</label>
          <input type="text" placeholder="1234 5678 9012 3456" className={inputClass('number')} {...field('number')} />
          {errors.number && <p className="mt-1 text-xs text-rose-600">{errors.number}</p>}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Expiry Date</label>
            <input type="text" placeholder="MM/YY" className={inputClass('expiry')} {...field('expiry')} />
            {errors.expiry && <p className="mt-1 text-xs text-rose-600">{errors.expiry}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">CVV</label>
            <input type="password" placeholder="•••" maxLength={4} className={inputClass('cvv')} {...field('cvv')} />
            {errors.cvv && <p className="mt-1 text-xs text-rose-600">{errors.cvv}</p>}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Name on Card</label>
          <input type="text" placeholder="John Doe" className={inputClass('name')} {...field('name')} />
          {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
        </div>

        <div className="mb-4 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm">
          <span className="text-slate-600">Amount to pay</span>
          <span className="text-lg font-black text-emerald-700">₹{amount.toFixed(2)}</span>
        </div>

        <button
          type="button"
          onClick={handlePay}
          disabled={processing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
        >
          {processing ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Processing payment…
            </>
          ) : (
            <>
              <CreditCard size={18} weight="bold" />
              Pay ₹{amount.toFixed(2)}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function CheckoutPage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState({})

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
  })

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) {
      navigate('/login', { replace: true })
      return
    }
    try {
      const parsed = JSON.parse(storedUser)
      if (parsed?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
      if (parsed?.role === 'delivery') { navigate('/delivery/dashboard', { replace: true }); return }
      setAuthUser(parsed)
      setForm((p) => ({ ...p, fullName: parsed.username || '', phone: parsed.phone || '' }))
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('supermarketCart')
      const items = raw ? JSON.parse(raw) : []
      if (items.length === 0) { navigate('/cart', { replace: true }); return }
      setCartItems(items)
    } catch {
      navigate('/cart', { replace: true })
    }
  }, [navigate])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0),
    [cartItems],
  )

  const validateForm = () => {
    const e = {}
    if (!form.fullName.trim() || form.fullName.trim().length < 2) e.fullName = 'Enter your full name'
    if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid 10-digit phone number'
    if (!form.addressLine.trim()) e.addressLine = 'Enter your delivery address'
    if (!form.city.trim()) e.city = 'Enter city'
    if (!form.state.trim()) e.state = 'Enter state'
    if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = 'Enter a valid 6-digit pincode'
    return e
  }

  const placeOrder = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) { navigate('/login', { replace: true }); return }

    setPlacing(true)
    setError('')

    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.create), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item._id,
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity || 1),
            thumbnail: item.thumbnail || '',
            unit: item.unit || '',
          })),
          deliveryAddress: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            addressLine: form.addressLine.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            pincode: form.pincode.trim(),
          },
          paymentMethod,
          totalAmount: subtotal,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Failed to place order. Please try again.')
        setPlacing(false)
        return
      }

      localStorage.removeItem('supermarketCart')
      navigate(`/order-success/${data.order._id}`, { replace: true })
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
      setPlacing(false)
    }
  }

  const handleProceed = () => {
    const errs = validateForm()
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setFormErrors({})
    if (paymentMethod === 'online') {
      setShowPaymentModal(true)
    } else {
      placeOrder()
    }
  }

  const updateField = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }))
    setFormErrors((p) => ({ ...p, [key]: '' }))
  }

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
    navigate('/login', { replace: true })
  }

  const inputClass = (key) =>
    `w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition ${
      formErrors[key] ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-slate-50'
    }`

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      {showPaymentModal && (
        <PaymentModal
          amount={subtotal}
          onSuccess={() => { setShowPaymentModal(false); placeOrder() }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            to="/cart"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
          >
            <ArrowLeft size={16} weight="bold" /> Back to Cart
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Almost done</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Checkout</h1>
          <p className="mt-2 text-sm text-slate-600">Fill in your delivery details and choose a payment method.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Delivery Address */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                  <Truck size={18} weight="bold" className="text-emerald-700" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Step 1</p>
                  <h2 className="text-lg font-bold text-slate-900">Delivery Address</h2>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Full Name *</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={form.fullName}
                      onChange={updateField('fullName')}
                      className={inputClass('fullName')}
                    />
                    {formErrors.fullName && <p className="mt-1 text-xs text-rose-600">{formErrors.fullName}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      value={form.phone}
                      onChange={updateField('phone')}
                      className={inputClass('phone')}
                    />
                    {formErrors.phone && <p className="mt-1 text-xs text-rose-600">{formErrors.phone}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Address Line *</label>
                  <input
                    type="text"
                    placeholder="Flat / House No., Street, Area, Landmark"
                    value={form.addressLine}
                    onChange={updateField('addressLine')}
                    className={inputClass('addressLine')}
                  />
                  {formErrors.addressLine && <p className="mt-1 text-xs text-rose-600">{formErrors.addressLine}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">City *</label>
                    <input
                      type="text"
                      placeholder="Mumbai"
                      value={form.city}
                      onChange={updateField('city')}
                      className={inputClass('city')}
                    />
                    {formErrors.city && <p className="mt-1 text-xs text-rose-600">{formErrors.city}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">State *</label>
                    <input
                      type="text"
                      placeholder="Maharashtra"
                      value={form.state}
                      onChange={updateField('state')}
                      className={inputClass('state')}
                    />
                    {formErrors.state && <p className="mt-1 text-xs text-rose-600">{formErrors.state}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Pincode *</label>
                    <input
                      type="text"
                      placeholder="400001"
                      maxLength={6}
                      value={form.pincode}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, '') }))
                        setFormErrors((p) => ({ ...p, pincode: '' }))
                      }}
                      className={inputClass('pincode')}
                    />
                    {formErrors.pincode && <p className="mt-1 text-xs text-rose-600">{formErrors.pincode}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                  <CreditCard size={18} weight="bold" className="text-emerald-700" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Step 2</p>
                  <h2 className="text-lg font-bold text-slate-900">Payment Method</h2>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    value: 'cod',
                    label: 'Cash on Delivery',
                    desc: 'Pay with cash when your order is delivered at your door',
                    icon: '💵',
                  },
                  {
                    value: 'online',
                    label: 'Online Payment',
                    desc: 'Pay securely now using your debit or credit card',
                    icon: '💳',
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${
                      paymentMethod === opt.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        paymentMethod === opt.value ? 'border-emerald-600' : 'border-slate-400'
                      }`}
                    >
                      {paymentMethod === opt.value && (
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{opt.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{opt.desc}</p>
                    </div>
                    <span className="shrink-0 text-2xl">{opt.icon}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'cod' && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  <p className="font-semibold">Note for Cash on Delivery</p>
                  <p className="mt-0.5 text-amber-700">Please keep exact change ready at the time of delivery.</p>
                </div>
              )}
              {paymentMethod === 'online' && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                  <LockKey size={14} weight="bold" className="shrink-0" />
                  <p>Your payment is encrypted and processed securely.</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <aside className="h-fit rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Summary</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Order Details</h2>

            <div className="mt-5 max-h-64 space-y-3 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item._id} className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-[10px] text-slate-400">No img</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">Qty: {item.quantity || 1}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-900">
                    ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span className="font-semibold text-emerald-700">Free</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-black text-slate-900">
                <span>Total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceed}
              disabled={placing}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
            >
              {placing ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Placing Order…
                </>
              ) : paymentMethod === 'online' ? (
                <>
                  <CreditCard size={16} weight="bold" />
                  Pay ₹{subtotal.toFixed(2)}
                </>
              ) : (
                <>
                  <Truck size={16} weight="bold" />
                  Place Order
                </>
              )}
            </button>

            <Link
              to="/cart"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <ArrowLeft size={16} weight="bold" />
              Back to Cart
            </Link>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  )
}

export default CheckoutPage
