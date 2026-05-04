import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Package, SignOut, Truck, CheckCircle, Clock, ArrowRight, Phone } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const STATUS_COLORS = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-violet-100 text-violet-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

const NEXT_STATUS = {
  confirmed: { label: 'Mark as Picked Up', next: 'shipped' },
  processing: { label: 'Mark as Picked Up', next: 'shipped' },
  shipped: { label: 'Mark as Delivered', next: 'delivered' },
}

function DeliveryDashboard() {
  const navigate = useNavigate()
  const [deliveryUser, setDeliveryUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('active')

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) { navigate('/login', { replace: true }); return }

    try {
      const parsed = JSON.parse(storedUser)
      if (parsed?.role !== 'delivery') { navigate('/', { replace: true }); return }
      setDeliveryUser(parsed)
      setIsCheckingAuth(false)
    } catch {
      localStorage.removeItem('authUser')
      localStorage.removeItem('authToken')
      navigate('/login', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (!deliveryUser) return

    const token = localStorage.getItem('authToken')
    if (!token) return

    setLoadingOrders(true)
    setError('')

    fetch(buildApiUrl(API_PATHS.orders.deliveryOrders), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders)
        else setError(data.message || 'Failed to load orders')
        setLoadingOrders(false)
      })
      .catch(() => {
        setError('Failed to load your orders. Check your connection.')
        setLoadingOrders(false)
      })
  }, [deliveryUser])

  const handleUpdateStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('authToken')
    setUpdatingId(orderId)
    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.updateStatus.replace(':id', orderId)), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderStatus: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, orderStatus: newStatus } : o)))
      } else {
        setError(data.message || 'Failed to update status')
      }
    } catch {
      setError('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    navigate('/login', { replace: true })
  }

  const activeOrders = useMemo(
    () => orders.filter((o) => ['confirmed', 'processing', 'shipped'].includes(o.orderStatus)),
    [orders],
  )
  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.orderStatus === 'delivered'),
    [orders],
  )

  const displayedOrders = activeTab === 'active' ? activeOrders : activeTab === 'delivered' ? deliveredOrders : orders

  if (isCheckingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-gradient-to-b from-amber-50 via-orange-50 to-white">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">Loading dashboard…</p>
      </main>
    )
  }

  if (!deliveryUser) return null

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-white text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="rounded-3xl border border-amber-100 bg-white p-6 shadow-lg shadow-amber-100/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Delivery Dashboard</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                Hi, {deliveryUser.username}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {deliveryUser.vehicleNumber ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Truck size={14} weight="bold" className="text-amber-600" />
                    {deliveryUser.vehicleNumber}
                  </span>
                ) : (
                  'No vehicle on record'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              <SignOut size={18} weight="bold" />
              Logout
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="inline-flex rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <Package size={20} weight="fill" />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total Assigned</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{orders.length}</p>
          </article>
          <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="inline-flex rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <Clock size={20} weight="fill" />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{activeOrders.length}</p>
          </article>
          <article className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
            <div className="inline-flex rounded-xl bg-green-100 p-2.5 text-green-700">
              <CheckCircle size={20} weight="fill" />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivered</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{deliveredOrders.length}</p>
          </article>
        </div>

        {/* Orders section */}
        <div className="mt-6 rounded-3xl border border-amber-100 bg-white p-6 shadow-lg shadow-amber-100/40">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black tracking-tight text-slate-900">My Deliveries</h2>
            <div className="flex gap-2">
              {[
                { key: 'active', label: `Active (${activeOrders.length})` },
                { key: 'delivered', label: `Delivered (${deliveredOrders.length})` },
                { key: 'all', label: `All (${orders.length})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === key
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}

          {loadingOrders ? (
            <div className="flex justify-center py-14">
              <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 py-14 text-center">
              <Package size={44} weight="thin" className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-500">
                {activeTab === 'active'
                  ? 'No active deliveries right now'
                  : activeTab === 'delivered'
                  ? 'No completed deliveries yet'
                  : 'No deliveries assigned yet'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Check back once admin assigns orders to you.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedOrders.map((order) => {
                const nextAction = NEXT_STATUS[order.orderStatus]
                const isUpdating = updatingId === order._id

                return (
                  <article
                    key={order._id}
                    className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                  >
                    <div className="p-5">
                      {/* Order header */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="font-bold text-slate-900 text-sm">{order.orderNumber}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLORS[order.orderStatus]}`}>
                          {order.orderStatus}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          order.paymentMethod === 'cod' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {order.paymentMethod === 'cod' ? '💵 Collect Cash' : '💳 Already Paid'}
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                        <div className="space-y-3">
                          {/* Customer */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
                            <p className="mt-1 font-semibold text-slate-900">{order.deliveryAddress?.fullName}</p>
                            <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                              <Phone size={11} className="shrink-0" />
                              {order.deliveryAddress?.phone}
                            </p>
                          </div>

                          {/* Address */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Delivery Address</p>
                            <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-700">
                              <MapPin size={14} className="mt-0.5 shrink-0 text-amber-500" weight="fill" />
                              <span>
                                {order.deliveryAddress?.addressLine},{' '}
                                {order.deliveryAddress?.city},{' '}
                                {order.deliveryAddress?.state} – {order.deliveryAddress?.pincode}
                              </span>
                            </p>
                          </div>

                          {/* Items */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Items</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {order.items?.map((item, i) => (
                                <span
                                  key={i}
                                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                                >
                                  {item.name} × {item.quantity}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: amount + action */}
                        <div className="flex flex-col items-end justify-between gap-3">
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Order Total</p>
                            <p className="text-xl font-black text-slate-900">₹{Number(order.totalAmount).toFixed(2)}</p>
                            {order.paymentMethod === 'cod' && (
                              <p className="mt-0.5 text-[11px] font-semibold text-amber-600">Collect on delivery</p>
                            )}
                          </div>

                          {nextAction && order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order._id, nextAction.next)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-amber-600 disabled:opacity-60 whitespace-nowrap"
                            >
                              {isUpdating ? (
                                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <ArrowRight size={13} weight="bold" />
                              )}
                              {isUpdating ? 'Updating…' : nextAction.label}
                            </button>
                          )}

                          {order.orderStatus === 'delivered' && (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-100 px-4 py-2 text-xs font-bold text-green-700">
                              <CheckCircle size={13} weight="fill" />
                              Delivered
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5">
                      <p className="text-xs text-slate-400">
                        Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default DeliveryDashboard
