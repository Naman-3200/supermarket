import { useCallback, useEffect, useState } from 'react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function fmt(v) {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

function AdminWithdrawals() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState('')
  const [notes, setNotes] = useState({})
  const token = localStorage.getItem('authToken')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const url = statusFilter !== 'all'
        ? `${API_PATHS.withdrawals.all}?status=${statusFilter}`
        : API_PATHS.withdrawals.all
      const res = await fetch(buildApiUrl(url), { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setRequests(Array.isArray(data.requests) ? data.requests : [])
      else setError(data.message || 'Failed to load withdrawal requests')
    } catch (_) {
      setError('Failed to load withdrawal requests')
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const updateStatus = async (id, status) => {
    setActionLoading(id)
    try {
      const res = await fetch(buildApiUrl(API_PATHS.withdrawals.update.replace(':id', id)), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, adminNotes: notes[id] || '' }),
      })
      const data = await res.json()
      if (res.ok) {
        setRequests((prev) => prev.map((r) => (r._id === id ? data.request : r)))
      }
    } catch (_) {}
    setActionLoading('')
  }

  const pending = requests.filter((r) => r.status === 'pending').length

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Finance</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Withdrawal Requests</h2>
        <p className="mt-0.5 text-sm text-gray-500">{pending > 0 ? `${pending} pending` : 'All caught up'}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {['all', 'pending', 'approved', 'paid', 'rejected'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-sm text-gray-400">
            No withdrawal requests found.
          </div>
        ) : requests.map((req) => {
          const partner = req.deliveryPartnerId
          return (
            <div key={req._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">{partner?.username || '—'}</p>
                  <p className="text-xs text-gray-500">{partner?.phone || ''} · {partner?.email || ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Requested {fmt(req.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">₹{Number(req.amount).toFixed(2)}</p>
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize mt-1 ${STATUS_STYLES[req.status] || ''}`}>
                    {req.status}
                  </span>
                </div>
              </div>

              {/* Payment details */}
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-600 space-y-1">
                <p><span className="font-semibold">Method:</span> {req.paymentMethod === 'upi' ? 'UPI / GPay' : 'Bank Transfer'}</p>
                {req.paymentMethod === 'upi' && <p><span className="font-semibold">UPI ID:</span> {req.upiId || '—'}</p>}
                {req.paymentMethod === 'bank' && (
                  <>
                    <p><span className="font-semibold">Account Holder:</span> {req.bankAccountHolder || '—'}</p>
                    <p><span className="font-semibold">Account No:</span> {req.bankAccountNumber || '—'}</p>
                    <p><span className="font-semibold">IFSC:</span> {req.bankIfsc || '—'}</p>
                    {req.bankName && <p><span className="font-semibold">Bank:</span> {req.bankName}</p>}
                  </>
                )}
              </div>

              {req.adminNotes && (
                <p className="text-xs text-gray-500 italic">Admin note: {req.adminNotes}</p>
              )}

              {req.status === 'pending' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Admin notes (optional)…"
                    value={notes[req._id] || ''}
                    onChange={(e) => setNotes((p) => ({ ...p, [req._id]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-gray-400 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actionLoading === req._id}
                      onClick={() => updateStatus(req._id, 'approved')}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === req._id}
                      onClick={() => updateStatus(req._id, 'paid')}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      Mark as Paid
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === req._id}
                      onClick={() => updateStatus(req._id, 'rejected')}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {req.status === 'approved' && (
                <button
                  type="button"
                  disabled={actionLoading === req._id}
                  onClick={() => updateStatus(req._id, 'paid')}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  Mark as Paid
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default AdminWithdrawals
