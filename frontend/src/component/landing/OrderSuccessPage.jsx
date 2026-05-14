import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, Package, ArrowRight } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const STATUS_STEPS = ['placed', 'confirmed', 'processing', 'shipped', 'delivered']

function OrderSuccessPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) { navigate('/login', { replace: true }); return }
    try {
      const parsed = JSON.parse(storedUser)
      setAuthUser(parsed)
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (!orderId) return
    const token = localStorage.getItem('authToken')
    if (!token) return

    fetch(buildApiUrl(API_PATHS.orders.getById.replace(':id', orderId)), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.order) setOrder(data.order)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [orderId])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
    navigate('/login', { replace: true })
  }

  const currentStep = order ? STATUS_STEPS.indexOf(order.orderStatus) : 0

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
          <div className="text-center">
            <CheckCircle size={72} weight="fill" className="mx-auto text-emerald-500" />
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900">Order Placed!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Thank you for shopping with us. Your order is confirmed.
            </p>
          </div>

          {loading ? (
            <div className="mt-10 flex justify-center">
              <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : order ? (
            <div className="mt-8 space-y-6">
              {/* Order meta */}
              <div className="rounded-2xl bg-emerald-50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Order Number</p>
                <p className="mt-1 text-lg font-black text-slate-900">{order.orderNumber}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold text-slate-900">₹{Number(order.totalAmount).toFixed(2)}</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 shadow-sm">
                    {order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      order.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {order.paymentStatus === 'paid' ? 'Payment received' : 'Pay on delivery'}
                  </span>
                </div>
              </div>

              {/* Delivery address */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Delivery Address</p>
                <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{order.deliveryAddress.fullName}</p>
                  <p className="mt-0.5">{order.deliveryAddress.addressLine}</p>
                  <p>
                    {order.deliveryAddress.city}, {order.deliveryAddress.state} – {order.deliveryAddress.pincode}
                  </p>
                  <p className="mt-0.5 text-slate-500">📞 {order.deliveryAddress.phone}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Items Ordered</p>
                <div className="mt-2 space-y-2">
                  {order.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm"
                    >
                      <span className="font-medium text-slate-800">
                        {item.name}{' '}
                        <span className="text-slate-400">× {item.quantity}</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status tracker */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Order Status</p>
                <div className="mt-3">
                  <div className="flex items-center gap-1">
                    {STATUS_STEPS.map((step, i) => (
                      <div key={step} className="flex flex-1 items-center gap-1">
                        <div
                          className={`h-2 flex-1 rounded-full transition-all ${
                            currentStep >= i ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {STATUS_STEPS.map((step) => (
                      <span
                        key={step}
                        className={STATUS_STEPS.indexOf(order.orderStatus) >= STATUS_STEPS.indexOf(step) ? 'text-emerald-600' : ''}
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <Package size={24} className="shrink-0 text-slate-400" />
              Order details could not be loaded. Check My Orders for your order history.
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/orders"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              <Package size={16} weight="bold" />
              View My Orders
            </Link>
            <Link
              to="/products"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Continue Shopping
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

export default OrderSuccessPage
