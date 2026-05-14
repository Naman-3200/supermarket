import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash, X, Check } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const TYPE_LABELS = { percentage: '% Off', fixed: '₹ Off', free_delivery: 'Free Delivery' }
const TYPE_COLORS = {
  percentage: 'bg-blue-50 text-blue-700 border-blue-200',
  fixed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  free_delivery: 'bg-violet-50 text-violet-700 border-violet-200',
}

function fmtDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = {
  code: '', type: 'percentage', value: '', description: '',
  minOrderAmount: '0', maxDiscount: '', usageLimit: '',
  isActive: true, expiryDate: '',
}

function CouponForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const token = localStorage.getItem('authToken')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const isEdit = Boolean(initial?._id)
    const payload = {
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: parseFloat(form.value) || 0,
      description: form.description,
      minOrderAmount: parseFloat(form.minOrderAmount) || 0,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
      isActive: form.isActive === true || form.isActive === 'true',
      expiryDate: form.expiryDate || null,
    }
    try {
      const url = isEdit
        ? buildApiUrl(API_PATHS.coupons.update.replace(':id', initial._id))
        : buildApiUrl(API_PATHS.coupons.create)
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to save'); setSaving(false); return }
      onSave(data.coupon)
    } catch (_) {
      setError('Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{initial?._id ? 'Edit Coupon' : 'New Coupon'}</h3>
        <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Code */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="c-code">Code *</label>
            <input id="c-code" name="code" type="text" placeholder="SAVE20" value={form.code} onChange={handleChange} required
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
          </div>
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="c-type">Type *</label>
            <select id="c-type" name="type" value={form.type} onChange={handleChange}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
              <option value="percentage">Percentage (% Off)</option>
              <option value="fixed">Fixed Amount (₹ Off)</option>
              <option value="free_delivery">Free Delivery</option>
            </select>
          </div>
          {/* Value */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="c-value">
              {form.type === 'percentage' ? 'Discount %' : form.type === 'fixed' ? 'Amount (₹)' : 'Value (set 0)'}
            </label>
            <input id="c-value" name="value" type="number" min="0" step="0.01" placeholder="0" value={form.value} onChange={handleChange}
              disabled={form.type === 'free_delivery'}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-100" />
          </div>
          {/* Min Order */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="c-min">Min Order Amount (₹)</label>
            <input id="c-min" name="minOrderAmount" type="number" min="0" placeholder="0" value={form.minOrderAmount} onChange={handleChange}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
          </div>
          {/* Max Discount */}
          {form.type === 'percentage' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="c-max">Max Discount Cap (₹)</label>
              <input id="c-max" name="maxDiscount" type="number" min="0" placeholder="Optional" value={form.maxDiscount} onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            </div>
          )}
          {/* Usage Limit */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="c-limit">Usage Limit</label>
            <input id="c-limit" name="usageLimit" type="number" min="0" placeholder="Unlimited" value={form.usageLimit} onChange={handleChange}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
          </div>
          {/* Expiry Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="c-expiry">Expiry Date</label>
            <input id="c-expiry" name="expiryDate" type="date" value={form.expiryDate ? form.expiryDate.split('T')[0] : ''} onChange={handleChange}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
          </div>
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="c-status">Status</label>
            <select id="c-status" value={String(form.isActive)} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'true' }))}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="c-desc">Description</label>
          <input id="c-desc" name="description" type="text" placeholder="e.g. Get 20% off on all orders" value={form.description} onChange={handleChange}
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
        </div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="flex gap-3 border-t border-gray-100 pt-4">
          <button type="submit" disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60">
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check size={14} weight="bold" />}
            {saving ? 'Saving…' : initial?._id ? 'Update Coupon' : 'Create Coupon'}
          </button>
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  )
}

function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const token = localStorage.getItem('authToken')

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await fetch(buildApiUrl(API_PATHS.coupons.list), { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setCoupons(data.coupons || [])
      else setError(data.message || 'Failed to load coupons')
    } catch (_) { setError('Failed to load coupons') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCoupons() }, [])

  const handleSaved = (coupon) => {
    setCoupons((prev) => {
      const exists = prev.find((c) => c._id === coupon._id)
      return exists ? prev.map((c) => (c._id === coupon._id ? coupon : c)) : [coupon, ...prev]
    })
    setShowForm(false)
    setEditingCoupon(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon?')) return
    try {
      await fetch(buildApiUrl(API_PATHS.coupons.delete.replace(':id', id)), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setCoupons((prev) => prev.filter((c) => c._id !== id))
    } catch (_) {}
  }

  const handleToggleActive = async (coupon) => {
    try {
      const res = await fetch(buildApiUrl(API_PATHS.coupons.update.replace(':id', coupon._id)), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      })
      const data = await res.json()
      if (res.ok) setCoupons((prev) => prev.map((c) => (c._id === coupon._id ? data.coupon : c)))
    } catch (_) {}
  }

  const active = coupons.filter((c) => c.isActive).length
  const expired = coupons.filter((c) => c.expiryDate && new Date(c.expiryDate) < new Date()).length

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Promotions</p>
          <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Coupons & Offers</h2>
          <p className="mt-0.5 text-sm text-gray-500">{coupons.length} total · {active} active · {expired} expired</p>
        </div>
        <button type="button" onClick={() => { setShowForm(true); setEditingCoupon(null) }}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          <Plus size={16} weight="bold" /> Add Coupon
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {(showForm && !editingCoupon) && (
        <CouponForm onSave={handleSaved} onCancel={() => setShowForm(false)} />
      )}
      {editingCoupon && (
        <CouponForm initial={editingCoupon} onSave={handleSaved} onCancel={() => setEditingCoupon(null)} />
      )}

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" /></div>
      ) : coupons.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <p className="text-sm text-gray-400">No coupons yet. Create one to start offering discounts!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Min Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Usage</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((coupon) => {
                  const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date()
                  return (
                    <tr key={coupon._id} className={`hover:bg-gray-50 transition-colors ${isExpired ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-gray-900 text-xs bg-gray-100 border border-gray-200 rounded px-2 py-0.5">{coupon.code}</span>
                        {coupon.description && <p className="mt-0.5 text-[11px] text-gray-500 truncate max-w-[160px]">{coupon.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${TYPE_COLORS[coupon.type]}`}>
                          {TYPE_LABELS[coupon.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : coupon.type === 'fixed' ? `₹${coupon.value}` : '—'}
                        {coupon.maxDiscount && <span className="text-[11px] text-gray-400 ml-1">(max ₹{coupon.maxDiscount})</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{coupon.minOrderAmount > 0 ? `₹${coupon.minOrderAmount}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {coupon.usedCount}/{coupon.usageLimit ?? '∞'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={isExpired ? 'text-red-600 font-medium text-xs' : 'text-gray-600 text-xs'}>{fmtDate(coupon.expiryDate)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${coupon.isActive && !isExpired ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {isExpired ? 'Expired' : coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button type="button" onClick={() => handleToggleActive(coupon)}
                          className={`mr-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${coupon.isActive ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                          {coupon.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" onClick={() => { setEditingCoupon(coupon); setShowForm(false) }}
                          className="mr-1 inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          <Pencil size={13} className="mr-1" /> Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(coupon._id)}
                          className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                          <Trash size={13} className="mr-1" /> Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminCoupons
