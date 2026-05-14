import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, ArrowRight, ArrowClockwise, X } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const STATUS_META = {
  pending:          { color: 'bg-slate-100 text-slate-700',   label: 'Pending' },
  placed:           { color: 'bg-blue-100 text-blue-700',     label: 'Placed' },
  confirmed:        { color: 'bg-emerald-100 text-emerald-700', label: 'Confirmed' },
  processing:       { color: 'bg-amber-100 text-amber-700',   label: 'Processing' },
  packed:           { color: 'bg-amber-100 text-amber-700',   label: 'Packed' },
  shipped:          { color: 'bg-violet-100 text-violet-700', label: 'Shipped' },
  out_for_delivery: { color: 'bg-violet-100 text-violet-700', label: 'Out for Delivery' },
  delivered:        { color: 'bg-green-100 text-green-700',   label: 'Delivered' },
  cancelled:        { color: 'bg-rose-100 text-rose-700',     label: 'Cancelled' },
  returned:         { color: 'bg-orange-100 text-orange-700', label: 'Returned' },
  refunded:         { color: 'bg-teal-100 text-teal-700',     label: 'Refunded' },
  failed_delivery:  { color: 'bg-rose-100 text-rose-700',     label: 'Failed Delivery' },
}

function OrdersPage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(null)

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

  const fetchOrders = () => {
    const token = localStorage.getItem('authToken')
    if (!token) return
    setLoading(true)
    fetch(buildApiUrl(API_PATHS.orders.myOrders), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.orders) setOrders(d.orders); else setError('Failed to load orders.'); setLoading(false) })
      .catch(() => { setError('Something went wrong.'); setLoading(false) })
  }

  useEffect(() => { fetchOrders() }, [])

  useEffect(() => {
    setFiltered(statusFilter === 'all' ? orders : orders.filter((o) => o.orderStatus === statusFilter))
  }, [orders, statusFilter])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
    navigate('/login', { replace: true })
  }

  const reorder = async (orderId) => {
    const token = localStorage.getItem('authToken')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.reorder.replace(':id', orderId)), { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.items) {
        const existing = JSON.parse(localStorage.getItem('supermarketCart') || '[]')
        const merged = [...existing]
        data.items.forEach((item) => {
          const idx = merged.findIndex((i) => i._id === String(item._id))
          if (idx >= 0) merged[idx].quantity += item.quantity
          else merged.push(item)
        })
        localStorage.setItem('supermarketCart', JSON.stringify(merged))
        window.dispatchEvent(new Event('cartUpdated'))
        navigate('/cart')
      }
    } catch { alert('Failed to reorder') }
  }

  const cancelOrder = async () => {
    if (!showCancelModal) return
    const token = localStorage.getItem('authToken')
    setCancellingId(showCancelModal)
    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.cancel.replace(':id', showCancelModal)), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: cancelReason }),
      })
      if (res.ok) { fetchOrders(); setShowCancelModal(null); setCancelReason('') }
      else { const d = await res.json(); alert(d.message || 'Cannot cancel order') }
    } catch { alert('Failed to cancel') }
    finally { setCancellingId(null) }
  }

  const canCancel = (status) => ['pending', 'placed', 'confirmed'].includes(status)

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'returned', label: 'Returned' },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="mb-3 text-lg font-bold text-slate-900">Cancel Order?</h3>
            <p className="mb-4 text-sm text-slate-600">Please tell us why you're cancelling. This helps us improve our service.</p>
            <div className="mb-3 space-y-2">
              {['Changed my mind', 'Wrong item ordered', 'Delivery taking too long', 'Found better price', 'Other'].map((r) => (
                <button key={r} type="button" onClick={() => setCancelReason(r)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition ${cancelReason === r ? 'border-rose-400 bg-rose-50 text-rose-700 font-semibold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={cancelOrder} disabled={!cancelReason || cancellingId}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60">
                {cancellingId ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
              <button type="button" onClick={() => { setShowCancelModal(null); setCancelReason('') }}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600">
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">My Orders</h1>
          <p className="mt-1 text-sm text-slate-600">Track and manage all your orders.</p>
        </div>

        {/* Status filter */}
        <div className="mb-5 flex flex-wrap gap-2">
          {filterOptions.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setStatusFilter(value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${statusFilter === value ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Package size={52} weight="thin" className="mx-auto text-slate-300" />
            <h2 className="mt-5 text-xl font-bold text-slate-900">{statusFilter === 'all' ? 'No orders yet' : `No ${statusFilter} orders`}</h2>
            <p className="mt-2 text-sm text-slate-500">Browse our products and place your first order.</p>
            <Link to="/products" className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Browse Products <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const meta = STATUS_META[order.orderStatus] || STATUS_META.pending
              return (
                <article key={order._id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                  <div className="p-5">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900">{order.orderNumber}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            {order.paymentMethod === 'cod' ? '💵 COD' : order.paymentMethod === 'razorpay' ? '💳 Razorpay' : '💳 Paid'}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-slate-600">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''} · <strong>₹{Number(order.totalAmount).toFixed(2)}</strong>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {canCancel(order.orderStatus) && (
                          <button type="button" onClick={() => setShowCancelModal(order._id)}
                            className="flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
                            <X size={12} weight="bold" /> Cancel
                          </button>
                        )}
                        {order.orderStatus === 'delivered' && (
                          <button type="button" onClick={() => reorder(order._id)}
                            className="flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
                            <ArrowClockwise size={12} weight="bold" /> Reorder
                          </button>
                        )}
                        <Link to={`/orders/${order._id}`}
                          className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
                          View Details <ArrowRight size={12} weight="bold" />
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5">
                    <p className="truncate text-xs text-slate-500">
                      📍 {order.deliveryAddress.addressLine}, {order.deliveryAddress.city}, {order.deliveryAddress.state}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

export default OrdersPage
