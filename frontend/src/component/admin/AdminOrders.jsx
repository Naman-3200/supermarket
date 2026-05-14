import { useEffect, useState, useMemo } from 'react'
import { Package, Truck, X, MagnifyingGlass, CaretDown, Check } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const STATUS_STYLES = {
  placed: 'bg-blue-50 text-blue-700 border border-blue-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  processing: 'bg-amber-50 text-amber-700 border border-amber-200',
  shipped: 'bg-violet-50 text-violet-700 border border-violet-200',
  delivered: 'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
  failed_delivery: 'bg-rose-50 text-rose-700 border border-rose-200',
}

const ALL_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed_delivery']

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
    } catch (_) {
      setError('Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Assign Delivery Partner</h2>
            <p className="mt-0.5 text-xs text-gray-400">{order.orderNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="font-medium text-gray-900">{order.deliveryAddress?.fullName}</p>
            <p className="mt-0.5 text-xs text-gray-500">{order.deliveryAddress?.addressLine}, {order.deliveryAddress?.city}</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">₹{Number(order.totalAmount).toFixed(2)}</p>
          </div>
          {order.assignedDeliveryPartner && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <Truck size={14} weight="bold" />
              Currently: <span className="font-semibold">{order.assignedDeliveryPartner.username || 'A partner'}</span>
            </div>
          )}
          <div>
            <label htmlFor="partner-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Select Partner</label>
            <div className="relative">
              <select id="partner-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-9 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                <option value="">— No partner / Unassign —</option>
                {deliveryPartners.map((p) => (
                  <option key={p.id} value={p.id}>{p.username} · {p.vehicleNumber || 'No vehicle'} · {p.phone}</option>
                ))}
              </select>
              <CaretDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleAssign} disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60">
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check size={15} weight="bold" />}
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusModal({ order, onUpdate, onClose }) {
  const [selectedStatus, setSelectedStatus] = useState(order.orderStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleUpdate = async () => {
    if (selectedStatus === order.orderStatus) { onClose(); return }
    setSaving(true)
    setError('')
    const token = localStorage.getItem('authToken')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.updateStatus.replace(':id', order._id)), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderStatus: selectedStatus }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to update'); setSaving(false); return }
      onUpdate(data.order)
    } catch (_) {
      setError('Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Update Order Status</h2>
            <p className="mt-0.5 text-xs text-gray-400">{order.orderNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">New Status</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedStatus(s)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${selectedStatus === s ? STATUS_STYLES[s] + ' ring-2 ring-offset-1 ring-gray-400' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleUpdate} disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60">
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check size={15} weight="bold" />}
              {saving ? 'Updating…' : 'Update Status'}
            </button>
          </div>
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
  const [statusOrder, setStatusOrder] = useState(null)

  const token = localStorage.getItem('authToken')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ordersRes, partnersRes] = await Promise.all([
          fetch(buildApiUrl(API_PATHS.orders.all), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(buildApiUrl(`${API_PATHS.auth.users}?role=delivery`), { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const [ordersData, partnersData] = await Promise.all([ordersRes.json(), partnersRes.json()])
        if (ordersRes.ok) setOrders(ordersData.orders || [])
        else setError(ordersData.message || 'Failed to load orders')
        if (partnersRes.ok) setDeliveryPartners(partnersData.users || [])
      } catch (_) {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [token])

  const handleAssigned = (updated) => {
    setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)))
    setAssigningOrder(null)
  }

  const handleStatusUpdated = (updated) => {
    setOrders((prev) => prev.map((o) => (o._id === updated._id ? { ...o, orderStatus: updated.orderStatus } : o)))
    setStatusOrder(null)
  }

  const filtered = useMemo(() => {
    let list = orders
    if (activeStatus !== 'all') list = list.filter((o) => o.orderStatus === activeStatus)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (o) => o.orderNumber?.toLowerCase().includes(q) || o.deliveryAddress?.fullName?.toLowerCase().includes(q) || o.deliveryAddress?.city?.toLowerCase().includes(q),
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
    return <div className="flex min-h-[400px] items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" /></div>
  }

  return (
    <section className="space-y-5">
      {assigningOrder && (
        <AssignModal order={assigningOrder} deliveryPartners={deliveryPartners} onAssign={handleAssigned} onClose={() => setAssigningOrder(null)} />
      )}
      {statusOrder && (
        <StatusModal order={statusOrder} onUpdate={handleStatusUpdated} onClose={() => setStatusOrder(null)} />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Management</p>
          <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Orders</h2>
          <p className="mt-0.5 text-sm text-gray-500">{orders.length} total orders</p>
        </div>
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search order, name, city…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[{ key: 'all', label: 'All' }, ...ALL_STATUSES.map((s) => ({ key: s, label: s }))].map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setActiveStatus(key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${activeStatus === key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'}`}>
            {label} <span className="ml-1 opacity-60">({counts[key] ?? 0})</span>
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <Package size={36} weight="thin" className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const partner = order.assignedDeliveryPartner
            return (
              <article key={order._id} className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{order.orderNumber}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[order.orderStatus]}`}>{order.orderStatus}</span>
                      <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">{order.paymentMethod === 'cod' ? 'COD' : 'Online'}</span>
                      {order.paymentStatus === 'paid' && <span className="rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">Paid</span>}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{order.deliveryAddress?.fullName}</span>
                      <span className="mx-2 text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{order.deliveryAddress?.addressLine}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-gray-900">₹{Number(order.totalAmount).toFixed(2)}</span>
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div>
                      {partner ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                          <Truck size={12} weight="bold" /> {partner.username} · {partner.vehicleNumber || 'No vehicle'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Unassigned</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button type="button" onClick={() => setStatusOrder(order)}
                      className="whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800">
                      Update Status
                    </button>
                    <button type="button" onClick={() => setAssigningOrder(order)}
                      className="whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
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
