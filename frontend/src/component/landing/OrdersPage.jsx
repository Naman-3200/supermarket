import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, ArrowRight } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const STATUS_COLORS = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-violet-100 text-violet-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

function OrdersPage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) { navigate('/login', { replace: true }); return }
    try {
      const parsed = JSON.parse(storedUser)
      if (parsed?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
      if (parsed?.role === 'delivery') { navigate('/delivery/dashboard', { replace: true }); return }
      setAuthUser(parsed)
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    fetch(buildApiUrl(API_PATHS.orders.myOrders), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders)
        else setError('Failed to load orders.')
        setLoading(false)
      })
      .catch(() => {
        setError('Something went wrong while loading your orders.')
        setLoading(false)
      })
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Account</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">My Orders</h1>
          <p className="mt-2 text-sm text-slate-600">Track and review all your past orders.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Package size={56} weight="thin" className="mx-auto text-slate-300" />
            <h2 className="mt-5 text-xl font-bold text-slate-900">No orders yet</h2>
            <p className="mt-2 text-sm text-slate-500">Browse our products and place your first order.</p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Browse Products
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article
                key={order._id}
                className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{order.orderNumber}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          STATUS_COLORS[order.orderStatus] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {order.orderStatus}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {order.paymentMethod === 'cod' ? '💵 COD' : '💳 Online'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          order.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} &middot;{' '}
                      <span className="font-bold text-slate-900">₹{Number(order.totalAmount).toFixed(2)}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Link
                    to={`/order-success/${order._id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
                  >
                    View Details
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                  <p className="truncate text-xs text-slate-500">
                    📍 {order.deliveryAddress.addressLine}, {order.deliveryAddress.city},{' '}
                    {order.deliveryAddress.state} – {order.deliveryAddress.pincode}
                  </p>
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

export default OrdersPage
