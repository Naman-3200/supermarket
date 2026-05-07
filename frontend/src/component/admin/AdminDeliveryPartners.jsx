import { useEffect, useState, useMemo } from 'react'
import { Truck, Phone, Envelope, MagnifyingGlass, UserCircle } from '@phosphor-icons/react'
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
      } catch (_err) {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [token])

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
    const activeStatuses = new Set(['confirmed', 'processing', 'shipped'])
    orders.forEach((order) => {
      if (order.assignedDeliveryPartner && activeStatuses.has(order.orderStatus)) {
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

  const totalActive = orders.filter(
    (o) => o.assignedDeliveryPartner && ['confirmed', 'processing', 'shipped'].includes(o.orderStatus),
  ).length
  const totalDelivered = orders.filter((o) => o.orderStatus === 'delivered').length

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    )
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Fleet</p>
          <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Delivery Partners</h2>
          <p className="mt-0.5 text-sm text-gray-500">{partners.length} registered partner{partners.length === 1 ? '' : 's'}</p>
        </div>
        <div className="relative w-full sm:w-64">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, phone, vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Partners</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{partners.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Deliveries</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{totalActive}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Completed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{totalDelivered}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <Truck size={36} weight="thin" className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">
            {partners.length === 0 ? 'No delivery partners registered yet' : 'No partners match your search'}
          </p>
          {partners.length === 0 && (
            <p className="mt-1 text-xs text-gray-400">Partners can sign up at /signup?role=delivery</p>
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
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Partner header */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <UserCircle size={24} weight="fill" className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{partner.username}</p>
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                      <Truck size={10} weight="bold" /> Delivery
                    </span>
                  </div>
                </div>

                {/* Contact info */}
                <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Envelope size={13} className="shrink-0 text-gray-400" />
                    <span className="truncate">{partner.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="shrink-0 text-gray-400" />
                    <span>{partner.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck size={13} className="shrink-0 text-gray-400" />
                    <span className="font-medium text-gray-800">{partner.vehicleNumber || 'No vehicle number'}</span>
                  </div>
                </div>

                {/* Order stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{total}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-600">{active}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600">{delivered}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Done</p>
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
