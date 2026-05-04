import { useEffect, useState, useMemo } from 'react'
import { Package, Truck, X, MagnifyingGlass, CaretDown, Check } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const STATUS_COLORS = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-violet-100 text-violet-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

const ALL_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

function AssignModal({ order, deliveryPartners, onAssign, onClose }) {
  const [selectedId, setSelectedId] = useState(
    order.assignedDeliveryPartner ? order.assignedDeliveryPartner._id || order.assignedDeliveryPartner : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAssign = async () => {
    setSaving(true)
    setError('')
    const token = localStorage.getItem('authToken')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.assign.replace(':id', order._id)), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deliveryPartnerId: selectedId || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to assign'); setSaving(false); return }
      onAssign(data.order)
    } catch {
      setError('Something went wrong')
      setSaving(false)
    }
  }

  const currentPartner = order.assignedDeliveryPartner

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Assign Delivery Partner</h2>
            <p className="mt-0.5 text-xs text-slate-500">{order.orderNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-800">{order.deliveryAddress?.fullName}</p>
          <p className="mt-0.5 text-slate-500 text-xs">
            {order.deliveryAddress?.addressLine}, {order.deliveryAddress?.city}
          </p>
          <p className="mt-1 font-bold text-slate-900">₹{Number(order.totalAmount).toFixed(2)}</p>
        </div>

        {currentPartner && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <Truck size={14} weight="bold" />
            Currently assigned: <span className="font-bold">{currentPartner.username || 'A partner'}</span>
          </div>
        )}

        <div className="mb-5">
          <label className="mb-2 block text-xs font-semibold text-slate-600">
            Select Delivery Partner
          </label>
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">— Unassign / No partner —</option>
              {deliveryPartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.username} · {p.vehicleNumber || 'No vehicle'} · {p.phone}
                </option>
              ))}
            </select>
            <CaretDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {error && <p className="mb-3 text-xs text-rose-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
          >
            {saving ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check size={16} weight="bold" />
            )}
            {saving ? 'Saving…' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [deliveryPartners, setDeliveryPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeStatus, setActiveStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [assigningOrder, setAssigningOrder] = useState(null)

  const token = localStorage.getItem('authToken')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ordersRes, partnersRes] = await Promise.all([
          fetch(buildApiUrl(API_PATHS.orders.all), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(buildApiUrl(`${API_PATHS.auth.users}?role=delivery`), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        const [ordersData, partnersData] = await Promise.all([ordersRes.json(), partnersRes.json()])

        if (ordersRes.ok) setOrders(ordersData.orders || [])
        else setError(ordersData.message || 'Failed to load orders')

        if (partnersRes.ok) setDeliveryPartners(partnersData.users || [])
      } catch {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [token])

  const handleAssigned = (updatedOrder) => {
    setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)))
    setAssigningOrder(null)
  }

  const filtered = useMemo(() => {
    let list = orders
    if (activeStatus !== 'all') list = list.filter((o) => o.orderStatus === activeStatus)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.deliveryAddress?.fullName?.toLowerCase().includes(q) ||
          o.deliveryAddress?.city?.toLowerCase().includes(q),
      )
    }
    return list
  }, [orders, activeStatus, search])

  const counts = useMemo(() => {
    const c = { all: orders.length }
    ALL_STATUSES.forEach((s) => { c[s] = orders.filter((o) => o.orderStatus === s).length })
    return c
  }, [orders])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/50">
      {assigningOrder && (
        <AssignModal
          order={assigningOrder}
          deliveryPartners={deliveryPartners}
          onAssign={handleAssigned}
          onClose={() => setAssigningOrder(null)}
        />
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Admin</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Orders</h2>
          <p className="mt-1 text-sm text-slate-500">Manage orders and assign delivery partners.</p>
        </div>
        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order, name, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-64"
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[{ key: 'all', label: 'All' }, ...ALL_STATUSES.map((s) => ({ key: s, label: s }))].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveStatus(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
              activeStatus === key
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            {label} <span className="ml-1 opacity-70">({counts[key] ?? 0})</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 py-12 text-center">
          <Package size={40} weight="thin" className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const partner = order.assignedDeliveryPartner
            return (
              <article
                key={order._id}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:border-emerald-200"
              >
                <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    {/* Top row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{order.orderNumber}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLORS[order.orderStatus]}`}>
                        {order.orderStatus}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        {order.paymentMethod === 'cod' ? '💵 COD' : '💳 Online'}
                      </span>
                      {order.paymentStatus === 'paid' && (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">Paid</span>
                      )}
                    </div>

                    {/* Customer + address */}
                    <div className="text-sm text-slate-700">
                      <span className="font-semibold">{order.deliveryAddress?.fullName}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="text-slate-500 text-xs">
                        {order.deliveryAddress?.addressLine}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state}
                      </span>
                    </div>

                    {/* Items + total */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</span>
                      <span className="font-bold text-slate-900">₹{Number(order.totalAmount).toFixed(2)}</span>
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    {/* Delivery partner */}
                    <div className="flex items-center gap-2">
                      {partner ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
                          <Truck size={12} weight="bold" />
                          {partner.username} · {partner.vehicleNumber || 'No vehicle'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <button
                      type="button"
                      onClick={() => setAssigningOrder(order)}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 whitespace-nowrap"
                    >
                      {partner ? 'Reassign' : 'Assign Partner'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default AdminOrders
