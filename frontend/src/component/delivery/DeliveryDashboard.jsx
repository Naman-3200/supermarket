import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Package, SignOut, Truck, CheckCircle, Clock, ArrowRight, Phone } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const STATUS_STYLES = {
  placed: 'bg-blue-50 text-blue-700 border border-blue-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  processing: 'bg-amber-50 text-amber-700 border border-amber-200',
  shipped: 'bg-violet-50 text-violet-700 border border-violet-200',
  delivered: 'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
}

const NEXT_STATUS = {
  confirmed: { label: 'Mark as Picked Up', next: 'shipped' },
  processing: { label: 'Mark as Picked Up', next: 'shipped' },
  shipped: { label: 'Mark as Delivered', next: 'delivered' },
}

function getDisplayedOrders(tab, activeOrders, deliveredOrders, allOrders) {
  if (tab === 'active') return activeOrders
  if (tab === 'delivered') return deliveredOrders
  return allOrders
}

function renderOrderListContent(isLoading, orders, emptyMessage, renderOrder) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-14">
        <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    )
  }
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 py-14 text-center">
        <Package size={36} weight="thin" className="mx-auto text-gray-300" />
        <p className="mt-3 text-sm font-medium text-gray-500">{emptyMessage}</p>
        <p className="mt-1 text-xs text-gray-400">Check back once admin assigns orders to you.</p>
      </div>
    )
  }
  return <div className="space-y-4">{orders.map(renderOrder)}</div>
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${iconBg}`}>
          <Icon size={20} className={iconColor} weight="fill" />
        </div>
      </div>
    </article>
  )
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
    } catch (err) {
      console.warn('Auth parse error:', err.message)
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

    fetch(buildApiUrl(API_PATHS.orders.deliveryOrders), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders)
        else setError(data.message || 'Failed to load orders')
        setLoadingOrders(false)
      })
      .catch(() => {
        setError('Failed to load orders. Check your connection.')
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
    } catch (err) {
      setError(err.message || 'Failed to update status')
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
  const deliveredOrders = useMemo(() => orders.filter((o) => o.orderStatus === 'delivered'), [orders])
  const displayedOrders = getDisplayedOrders(activeTab, activeOrders, deliveredOrders, orders)

  if (isCheckingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Verifying access…</p>
        </div>
      </main>
    )
  }

  if (!deliveryUser) return null

  const emptyMessages = {
    active: 'No active deliveries right now',
    delivered: 'No completed deliveries yet',
    all: 'No deliveries assigned yet',
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
              <Truck size={18} className="text-amber-600" weight="fill" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Delivery Portal</p>
              <p className="text-sm font-semibold text-gray-900">{deliveryUser.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {deliveryUser.vehicleNumber && (
              <span className="hidden items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 sm:inline-flex">
                <Truck size={12} className="text-gray-400" />
                {deliveryUser.vehicleNumber}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <SignOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Package} iconBg="bg-blue-50" iconColor="text-blue-600" label="Total Assigned" value={orders.length} />
          <StatCard icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" label="Active" value={activeOrders.length} />
          <StatCard icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Delivered" value={deliveredOrders.length} />
        </div>

        {/* Orders panel */}
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Panel header */}
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-gray-900">My Deliveries</h2>
            <div className="flex gap-1.5">
              {[
                { key: 'active', label: `Active (${activeOrders.length})` },
                { key: 'delivered', label: `Delivered (${deliveredOrders.length})` },
                { key: 'all', label: `All (${orders.length})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === key
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {renderOrderListContent(loadingOrders, displayedOrders, emptyMessages[activeTab], (order) => {
                  const nextAction = NEXT_STATUS[order.orderStatus]
                  const isUpdating = updatingId === order._id
                  const isCompleted = order.orderStatus === 'delivered'
                  const isCancelled = order.orderStatus === 'cancelled'

                  return (
                    <article key={order._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      {/* Order header */}
                      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3">
                        <span className="font-semibold text-sm text-gray-900">{order.orderNumber}</span>
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[order.orderStatus]}`}>
                          {order.orderStatus}
                        </span>
                        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${order.paymentMethod === 'cod' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                          {order.paymentMethod === 'cod' ? 'Collect Cash' : 'Already Paid'}
                        </span>
                      </div>

                      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
                        <div className="space-y-3">
                          {/* Customer */}
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Customer</p>
                            <p className="mt-0.5 font-semibold text-gray-900">{order.deliveryAddress?.fullName}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                              <Phone size={11} className="shrink-0" />
                              {order.deliveryAddress?.phone}
                            </p>
                          </div>

                          {/* Address */}
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Delivery Address</p>
                            <p className="mt-0.5 flex items-start gap-1.5 text-sm text-gray-700">
                              <MapPin size={13} className="mt-0.5 shrink-0 text-amber-500" weight="fill" />
                              <span>
                                {order.deliveryAddress?.addressLine}, {order.deliveryAddress?.city},{' '}
                                {order.deliveryAddress?.state} – {order.deliveryAddress?.pincode}
                              </span>
                            </p>
                          </div>

                          {/* Items */}
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Items</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {order.items?.map((item, i) => (
                                <span key={`${item.name ?? 'item'}-${i}`} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                                  {item.name} × {item.quantity}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: total + action */}
                        <div className="flex flex-col items-end justify-between gap-4">
                          <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Order Total</p>
                            <p className="mt-0.5 text-2xl font-bold text-gray-900">₹{Number(order.totalAmount).toFixed(2)}</p>
                            {order.paymentMethod === 'cod' && (
                              <p className="mt-0.5 text-xs font-medium text-amber-600">Collect on delivery</p>
                            )}
                          </div>

                          {nextAction && !isCompleted && !isCancelled && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order._id, nextAction.next)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60 whitespace-nowrap"
                            >
                              {isUpdating ? (
                                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <ArrowRight size={13} weight="bold" />
                              )}
                              {isUpdating ? 'Updating…' : nextAction.label}
                            </button>
                          )}

                          {isCompleted && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">
                              <CheckCircle size={13} weight="fill" />
                              Delivered
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 bg-gray-50 px-5 py-2.5">
                        <p className="text-xs text-gray-400">
                          Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </article>
                  )
                })}
          </div>
        </div>
      </div>
    </main>
  )
}

export default DeliveryDashboard
