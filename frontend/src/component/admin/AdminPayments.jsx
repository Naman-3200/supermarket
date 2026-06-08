import { useEffect, useState, useMemo } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const PAYMENT_STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

const ORDER_STATUS_STYLES = {
  placed: 'text-blue-600',
  confirmed: 'text-emerald-600',
  processing: 'text-amber-600',
  shipped: 'text-violet-600',
  delivered: 'text-green-600',
  cancelled: 'text-red-600',
  failed_delivery: 'text-rose-600',
}

function fmt(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function AdminPayments() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [payStatusFilter, setPayStatusFilter] = useState('all')
  const token = localStorage.getItem('authToken')

  useEffect(() => {
    fetch(buildApiUrl(API_PATHS.orders.all), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.orders) { setOrders(data.orders) } else { setError(data.message || 'Failed') } })
      .catch(() => setError('Failed to load payments'))
      .finally(() => setLoading(false))
  }, [token])

  const stats = useMemo(() => {
    const nonCancelled = orders.filter((o) => !['cancelled', 'failed_delivery'].includes(o.orderStatus))
    return {
      totalRevenue: nonCancelled.reduce((s, o) => s + o.totalAmount, 0),
      onlineRevenue: nonCancelled.filter((o) => o.paymentMethod === 'online').reduce((s, o) => s + o.totalAmount, 0),
      codRevenue: nonCancelled.filter((o) => o.paymentMethod === 'cod').reduce((s, o) => s + o.totalAmount, 0),
      codPending: orders.filter((o) => o.paymentMethod === 'cod' && o.paymentStatus === 'pending' && o.orderStatus === 'delivered').reduce((s, o) => s + o.totalAmount, 0),
      paidCount: orders.filter((o) => o.paymentStatus === 'paid').length,
      pendingCount: orders.filter((o) => o.paymentStatus === 'pending').length,
      failedCount: orders.filter((o) => o.paymentStatus === 'failed').length,
    }
  }, [orders])

  const displayed = useMemo(() => {
    let list = orders
    if (methodFilter !== 'all') list = list.filter((o) => o.paymentMethod === methodFilter)
    if (payStatusFilter !== 'all') list = list.filter((o) => o.paymentStatus === payStatusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((o) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.deliveryAddress?.fullName?.toLowerCase().includes(q) ||
        o.userId?.email?.toLowerCase().includes(q)
      )
    }
    return list
  }, [orders, methodFilter, payStatusFilter, search])

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" /></div>

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Finance</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Payment Management</h2>
        <p className="mt-0.5 text-sm text-gray-500">Transaction history and reconciliation.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">₹{Math.round(stats.totalRevenue).toLocaleString('en-IN')}</p>
          <p className="mt-1 text-xs text-gray-400">Excluding cancelled orders</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Online Payments</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">₹{Math.round(stats.onlineRevenue).toLocaleString('en-IN')}</p>
          <p className="mt-1 text-xs text-gray-400">{stats.paidCount} paid transactions</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">COD Revenue</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">₹{Math.round(stats.codRevenue).toLocaleString('en-IN')}</p>
          <p className="mt-1 text-xs text-gray-400">{stats.pendingCount} pending collection</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">COD Pending Collection</p>
          <p className="mt-2 text-2xl font-bold text-red-600">₹{Math.round(stats.codPending).toLocaleString('en-IN')}</p>
          <p className="mt-1 text-xs text-gray-400">Delivered but not paid</p>
        </div>
      </div>

      {/* COD Reconciliation Alert */}
      {stats.codPending > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">COD Reconciliation Required</p>
          <p className="mt-1 text-xs text-amber-700">
            ₹{Math.round(stats.codPending).toLocaleString('en-IN')} is pending collection from delivered COD orders.
            Filter by "COD" + "Pending" to view these orders.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs font-medium">
            {[{ v: 'all', l: 'All Methods' }, { v: 'cod', l: 'COD' }, { v: 'online', l: 'Online' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => setMethodFilter(v)}
                className={`px-3 py-1.5 transition-colors ${methodFilter === v ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs font-medium">
            {[{ v: 'all', l: 'All Status' }, { v: 'pending', l: 'Pending' }, { v: 'paid', l: 'Paid' }, { v: 'failed', l: 'Failed' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => setPayStatusFilter(v)}
                className={`px-3 py-1.5 transition-colors ${payStatusFilter === v ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="relative">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search order, customer…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none w-52" />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Pay Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Order Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-400">No transactions found.</td></tr>
              ) : displayed.map((o) => (
                <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium text-gray-900">{o.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-xs">{o.deliveryAddress?.fullName}</p>
                    {o.userId?.email && <p className="text-[11px] text-gray-500">{o.userId.email}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{Number(o.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${o.paymentMethod === 'cod' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {o.paymentMethod === 'cod' ? 'COD' : 'Online'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${PAYMENT_STATUS_STYLES[o.paymentStatus] || ''}`}>
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium capitalize ${ORDER_STATUS_STYLES[o.orderStatus] || 'text-gray-600'}`}>{o.orderStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmt(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayed.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs text-gray-400">{displayed.length} transaction{displayed.length !== 1 ? 's' : ''}</p>
            <p className="text-xs font-semibold text-gray-700">
              Total: ₹{displayed.filter((o) => !['cancelled', 'failed_delivery'].includes(o.orderStatus)).reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminPayments
