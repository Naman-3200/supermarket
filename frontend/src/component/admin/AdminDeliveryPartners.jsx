import { useEffect, useState, useMemo } from 'react'
import { Truck, Package, Phone, Envelope, MagnifyingGlass, UserCircle } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function AdminDeliveryPartners() {
  const [partners, setPartners] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const token = localStorage.getItem('authToken')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [partnersRes, ordersRes] = await Promise.all([
          fetch(buildApiUrl(`${API_PATHS.auth.users}?role=delivery`), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(buildApiUrl(API_PATHS.orders.all), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        const [partnersData, ordersData] = await Promise.all([partnersRes.json(), ordersRes.json()])

        if (partnersRes.ok) setPartners(partnersData.users || [])
        else setError(partnersData.message || 'Failed to load partners')

        if (ordersRes.ok) setOrders(ordersData.orders || [])
      } catch {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [token])

  // Count assigned orders per partner
  const orderCountMap = useMemo(() => {
    const map = {}
    orders.forEach((order) => {
      if (order.assignedDeliveryPartner) {
        const pid = order.assignedDeliveryPartner._id || order.assignedDeliveryPartner
        map[pid] = (map[pid] || 0) + 1
      }
    })
    return map
  }, [orders])

  const activeOrderCountMap = useMemo(() => {
    const map = {}
    const activeStatuses = ['confirmed', 'processing', 'shipped']
    orders.forEach((order) => {
      if (order.assignedDeliveryPartner && activeStatuses.includes(order.orderStatus)) {
        const pid = order.assignedDeliveryPartner._id || order.assignedDeliveryPartner
        map[pid] = (map[pid] || 0) + 1
      }
    })
    return map
  }, [orders])

  const deliveredCountMap = useMemo(() => {
    const map = {}
    orders.forEach((order) => {
      if (order.assignedDeliveryPartner && order.orderStatus === 'delivered') {
        const pid = order.assignedDeliveryPartner._id || order.assignedDeliveryPartner
        map[pid] = (map[pid] || 0) + 1
      }
    })
    return map
  }, [orders])

  const filtered = useMemo(() => {
    if (!search.trim()) return partners
    const q = search.trim().toLowerCase()
    return partners.filter(
      (p) =>
        p.username?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.vehicleNumber?.toLowerCase().includes(q),
    )
  }, [partners, search])

  const totalAssigned = orders.filter((o) => o.assignedDeliveryPartner).length
  const totalDelivered = orders.filter((o) => o.orderStatus === 'delivered').length
  const totalActive = orders.filter(
    (o) => o.assignedDeliveryPartner && ['confirmed', 'processing', 'shipped'].includes(o.orderStatus),
  ).length

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/50">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Admin</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Delivery Partners</h2>
          <p className="mt-1 text-sm text-slate-500">
            {partners.length} registered partner{partners.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-60"
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Total Partners</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{partners.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Active Deliveries</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalActive}</p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">Completed Deliveries</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalDelivered}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 py-14 text-center">
          <Truck size={44} weight="thin" className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">
            {partners.length === 0 ? 'No delivery partners registered yet' : 'No partners match your search'}
          </p>
          {partners.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">Delivery partners sign up at /signup?role=delivery</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((partner) => {
            const pid = partner.id
            const total = orderCountMap[pid] || 0
            const active = activeOrderCountMap[pid] || 0
            const delivered = deliveredCountMap[pid] || 0

            return (
              <article
                key={pid}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <UserCircle size={28} weight="fill" className="text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{partner.username}</p>
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      <Truck size={10} weight="bold" /> Delivery Partner
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Envelope size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">{partner.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0 text-slate-400" />
                    <span>{partner.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="shrink-0 text-slate-400" />
                    <span className="font-semibold text-slate-800">{partner.vehicleNumber || 'No vehicle number'}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                  <div className="text-center">
                    <p className="text-lg font-black text-slate-900">{total}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-amber-600">{active}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-green-600">{delivered}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Delivered</p>
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

export default AdminDeliveryPartners
