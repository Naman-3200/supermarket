import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, Phone, ArrowClockwise, DownloadSimple, X } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_BASE_URL, API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const STATUS_STEPS = [
  { key: 'pending',          label: 'Order Placed',      icon: '📋' },
  { key: 'confirmed',        label: 'Confirmed',         icon: '✅' },
  { key: 'packed',           label: 'Packed',            icon: '📦' },
  { key: 'out_for_delivery', label: 'Out for Delivery',  icon: '🚚' },
  { key: 'delivered',        label: 'Delivered',         icon: '🎉' },
]

const STATUS_META = {
  pending:          { color: 'bg-slate-100 text-slate-700',    label: 'Pending' },
  placed:           { color: 'bg-blue-100 text-blue-700',      label: 'Placed' },
  confirmed:        { color: 'bg-emerald-100 text-emerald-700',label: 'Confirmed' },
  processing:       { color: 'bg-amber-100 text-amber-700',    label: 'Processing' },
  packed:           { color: 'bg-amber-100 text-amber-700',    label: 'Packed' },
  shipped:          { color: 'bg-violet-100 text-violet-700',  label: 'Shipped' },
  out_for_delivery: { color: 'bg-violet-100 text-violet-700',  label: 'Out for Delivery' },
  delivered:        { color: 'bg-green-100 text-green-700',    label: 'Delivered' },
  cancelled:        { color: 'bg-rose-100 text-rose-700',      label: 'Cancelled' },
  returned:         { color: 'bg-orange-100 text-orange-700',  label: 'Returned' },
  refunded:         { color: 'bg-teal-100 text-teal-700',      label: 'Refunded' },
  failed_delivery:  { color: 'bg-rose-100 text-rose-700',      label: 'Failed Delivery' },
}

function OrderDetailsPage() {
  const navigate = useNavigate()
  const { orderId } = useParams()
  const [authUser, setAuthUser] = useState(null)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [returnReason, setReturnReason] = useState('')
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [submittingReturn, setSubmittingReturn] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) { navigate('/login', { replace: true }); return }
    try {
      const parsed = JSON.parse(storedUser)
      setAuthUser(parsed)
    } catch { navigate('/login', { replace: true }) }
  }, [navigate])

  const fetchOrder = () => {
    const token = localStorage.getItem('authToken')
    if (!token) return
    setLoading(true)
    fetch(buildApiUrl(API_PATHS.orders.getById.replace(':id', orderId)), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.order) setOrder(d.order); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { if (orderId) fetchOrder() }, [orderId])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
    navigate('/login', { replace: true })
  }

  const handleCancel = async () => {
    const token = localStorage.getItem('authToken')
    setCancelling(true)
    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.cancel.replace(':id', orderId)), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: cancelReason }),
      })
      if (res.ok) { fetchOrder(); setShowCancelForm(false) }
      else { const d = await res.json(); alert(d.message || 'Cannot cancel') }
    } finally { setCancelling(false) }
  }

  const handleReturn = async () => {
    if (!returnReason.trim()) return
    const token = localStorage.getItem('authToken')
    setSubmittingReturn(true)
    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.return.replace(':id', orderId)), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: returnReason }),
      })
      if (res.ok) { fetchOrder(); setShowReturnForm(false) }
      else { const d = await res.json(); alert(d.message || 'Cannot request return') }
    } finally { setSubmittingReturn(false) }
  }

  const reorder = async () => {
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

  const openInvoice = () => {
    const token = localStorage.getItem('authToken')
    const url = `${API_BASE_URL}${API_PATHS.orders.invoice.replace(':id', orderId)}`
    // Open with auth token in a new window via fetch blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.text())
      .then((html) => {
        const w = window.open('', '_blank')
        w.document.write(html)
        w.document.close()
      })
      .catch(() => alert('Failed to load invoice'))
  }

  const currentStepIndex = order
    ? STATUS_STEPS.findIndex((s) => s.key === order.orderStatus)
    : -1

  const isCancellable = order && ['pending', 'placed', 'confirmed'].includes(order.orderStatus)
  const isReturnable = order?.orderStatus === 'delivered' && !order?.returnRequest

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />
        <div className="flex justify-center py-32"><span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>
        <Footer />
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="text-slate-600">Order not found.</p>
          <Link to="/orders" className="mt-4 inline-block text-emerald-700 underline">Back to Orders</Link>
        </div>
        <Footer />
      </main>
    )
  }

  const meta = STATUS_META[order.orderStatus] || STATUS_META.pending

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Link to="/orders" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700">
          <ArrowLeft size={16} weight="bold" /> Back to Orders
        </Link>

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${meta.color}`}>{meta.label}</span>
        </div>

        {/* Tracking */}
        {!['cancelled', 'returned', 'refunded', 'failed_delivery'].includes(order.orderStatus) && (
          <div className="mb-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-base font-bold text-slate-900">Order Tracking</h2>
            <div className="relative">
              <div className="absolute left-5 top-0 h-full w-0.5 bg-slate-100" />
              <div className="space-y-4">
                {STATUS_STEPS.map((step, i) => {
                  const done = currentStepIndex >= i
                  const current = currentStepIndex === i
                  return (
                    <div key={step.key} className="relative flex items-start gap-4">
                      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg transition ${
                        done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200 bg-white'
                      } ${current ? 'ring-4 ring-emerald-100' : ''}`}>
                        {done ? <span className="text-white text-xs">{step.icon}</span> : <span className="text-slate-300 text-xs">{step.icon}</span>}
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                        {current && <p className="text-xs text-emerald-600 font-medium">Current status</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Delivery agent */}
        {order.assignedDeliveryPartner && (
          <div className="mb-6 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-slate-900">Delivery Partner</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                  {order.assignedDeliveryPartner.username?.[0]?.toUpperCase() || 'D'}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{order.assignedDeliveryPartner.username}</p>
                  <p className="text-xs text-slate-500">{order.assignedDeliveryPartner.vehicleNumber || 'Delivery Agent'}</p>
                </div>
              </div>
              {order.assignedDeliveryPartner.phone && (
                <a href={`tel:${order.assignedDeliveryPartner.phone}`}
                  className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  <Phone size={16} weight="bold" /> Call
                </a>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Items Ordered</h2>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                  {item.thumbnail ? <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-300 text-xs">No img</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">×{item.quantity} · {item.unit || ''}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-900">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Bill Summary</h2>
          <div className="space-y-2 text-sm">
            {[
              ['Subtotal', `₹${Number(order.subtotal || order.totalAmount).toFixed(2)}`],
              ['Delivery', order.deliveryCharge > 0 ? `₹${order.deliveryCharge}` : 'Free'],
              ['Tax (5% GST)', `₹${Number(order.taxAmount || 0).toFixed(2)}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-slate-600">
                <span>{l}</span>
                <span className={`font-semibold ${v === 'Free' ? 'text-emerald-700' : ''}`}>{v}</span>
              </div>
            ))}
            {order.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Coupon ({order.couponCode})</span>
                <span className="font-semibold">–₹{order.couponDiscount.toFixed(2)}</span>
              </div>
            )}
            {order.walletAmountUsed > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Wallet Used</span>
                <span className="font-semibold">–₹{order.walletAmountUsed.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-black text-slate-900">
              <span>Total Paid</span>
              <span>₹{Number(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span>Payment: {order.paymentMethod.toUpperCase()}</span>
            <span>·</span>
            <span className={order.paymentStatus === 'paid' ? 'text-emerald-700 font-semibold' : order.paymentStatus === 'refunded' ? 'text-teal-700 font-semibold' : 'text-amber-700 font-semibold'}>
              {order.paymentStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Delivery address */}
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-slate-900">Delivery Address</h2>
          <p className="text-sm font-semibold text-slate-800">{order.deliveryAddress.fullName}</p>
          <p className="mt-0.5 text-sm text-slate-600">{order.deliveryAddress.addressLine}</p>
          <p className="text-sm text-slate-600">{order.deliveryAddress.city}, {order.deliveryAddress.state} – {order.deliveryAddress.pincode}</p>
          <p className="mt-0.5 text-sm text-slate-500">📞 {order.deliveryAddress.phone}</p>
          {order.orderNotes && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">📝 {order.orderNotes}</p>}
        </div>

        {/* Return info */}
        {order.returnRequest && (
          <div className="mb-6 rounded-3xl border border-orange-100 bg-orange-50 p-5">
            <h2 className="mb-2 text-base font-bold text-orange-800">Return Request</h2>
            <p className="text-sm text-orange-700">Reason: {order.returnRequest.reason}</p>
            <p className="mt-1 text-xs text-orange-600">
              Status: <strong className="capitalize">{order.returnRequest.status}</strong> · Submitted {new Date(order.returnRequest.requestedAt).toLocaleDateString('en-IN')}
            </p>
          </div>
        )}

        {/* Cancel info */}
        {order.orderStatus === 'cancelled' && order.cancelReason && (
          <div className="mb-6 rounded-3xl border border-rose-100 bg-rose-50 p-5">
            <p className="text-sm font-semibold text-rose-700">Cancellation Reason</p>
            <p className="mt-1 text-sm text-rose-600">{order.cancelReason}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {isCancellable && !showCancelForm && (
            <button type="button" onClick={() => setShowCancelForm(true)}
              className="flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
              <X size={16} weight="bold" /> Cancel Order
            </button>
          )}

          {order.orderStatus === 'delivered' && (
            <button type="button" onClick={reorder}
              className="flex items-center gap-2 rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
              <ArrowClockwise size={16} weight="bold" /> Reorder
            </button>
          )}

          {isReturnable && !showReturnForm && (
            <button type="button" onClick={() => setShowReturnForm(true)}
              className="flex items-center gap-2 rounded-xl border border-orange-300 px-4 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50">
              <Package size={16} weight="bold" /> Request Return
            </button>
          )}

          {['delivered', 'cancelled', 'returned'].includes(order.orderStatus) && (
            <button type="button" onClick={openInvoice}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
              <DownloadSimple size={16} weight="bold" /> Download Invoice
            </button>
          )}

          <Link to={`/support?orderId=${order._id}&orderNo=${order.orderNumber}`}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
            Need Help?
          </Link>
        </div>

        {/* Cancel form */}
        {showCancelForm && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="mb-3 text-sm font-semibold text-rose-800">Why are you cancelling?</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {['Changed my mind', 'Wrong item ordered', 'Delivery taking too long', 'Found better price', 'Other'].map((r) => (
                <button key={r} type="button" onClick={() => setCancelReason(r)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${cancelReason === r ? 'border-rose-500 bg-rose-100 text-rose-700' : 'border-rose-200 text-rose-600 hover:bg-rose-100'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleCancel} disabled={!cancelReason || cancelling}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60">
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
              <button type="button" onClick={() => { setShowCancelForm(false); setCancelReason('') }}
                className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600">
                Keep Order
              </button>
            </div>
          </div>
        )}

        {/* Return form */}
        {showReturnForm && (
          <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <p className="mb-2 text-sm font-semibold text-orange-800">Reason for return</p>
            <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} rows={3} placeholder="Describe why you want to return this order…"
              className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={handleReturn} disabled={!returnReason.trim() || submittingReturn}
                className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-60">
                {submittingReturn ? 'Submitting…' : 'Submit Return Request'}
              </button>
              <button type="button" onClick={() => { setShowReturnForm(false); setReturnReason('') }}
                className="rounded-xl border border-orange-200 px-4 py-2.5 text-sm font-semibold text-orange-600">
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

export default OrderDetailsPage
