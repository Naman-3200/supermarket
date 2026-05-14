import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  House, Package, Wallet, User, SignOut, Truck, CheckCircle, MapPin, Phone,
  X, Camera, Warning, WifiHigh, WifiSlash, Coffee, Bell, CaretRight,
  ArrowCounterClockwise, XCircle, SealCheck, ChartBar,
} from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

// ─── Constants ────────────────────────────────────────────────────────────────

const DELIVERY_FEE = 30

const STATUS_STYLES = {
  placed: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-violet-50 text-violet-700 border-violet-200',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  failed_delivery: 'bg-rose-50 text-rose-700 border-rose-200',
}

const STATUS_LABELS = {
  placed: 'New',
  confirmed: 'Pending Acceptance',
  processing: 'Going to Pickup',
  shipped: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed_delivery: 'Failed',
}

const AVAILABILITY_CONFIG = {
  online: { label: 'Online', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: WifiHigh },
  break: { label: 'On Break', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Coffee },
  offline: { label: 'Offline', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400', icon: WifiSlash },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function buildMapsUrl(addr) {
  const q = encodeURIComponent(`${addr.addressLine}, ${addr.city}, ${addr.state} ${addr.pincode}`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

// ─── Small shared components ──────────────────────────────────────────────────

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon size={18} className={iconColor} weight="fill" />
        </div>
      </div>
    </article>
  )
}

function AvailabilityBadge({ status }) {
  const cfg = AVAILABILITY_CONFIG[status] || AVAILABILITY_CONFIG.offline
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Earnings bar chart ───────────────────────────────────────────────────────

function EarningsBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.earnings), 1)
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => {
        const pct = (d.earnings / max) * 100
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-gray-500">{d.earnings > 0 ? `₹${d.earnings}` : ''}</span>
            <div className="w-full flex items-end" style={{ height: '72px' }}>
              <div
                className="w-full rounded-t-md bg-amber-400 transition-all"
                style={{ height: `${Math.max(pct, d.earnings > 0 ? 8 : 2)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400">{d.day}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Proof Photo Modal ────────────────────────────────────────────────────────

function ProofModal({ order, token, onClose, onSuccess }) {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleConfirm = async () => {
    setUploading(true)
    setError('')
    try {
      let proofImageUrl = ''

      if (file) {
        const fd = new FormData()
        fd.append('images', file)
        fd.append('folder', 'delivery-proof')
        const upRes = await fetch(buildApiUrl(API_PATHS.uploads.images), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.message || 'Upload failed')
        proofImageUrl = upData.images?.[0]?.url || ''
      }

      // Attach proof then mark delivered
      if (proofImageUrl) {
        await fetch(buildApiUrl(API_PATHS.orders.proof.replace(':id', order._id)), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ proofImageUrl }),
        })
      }

      const statusRes = await fetch(buildApiUrl(API_PATHS.orders.updateStatus.replace(':id', order._id)), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderStatus: 'delivered' }),
      })
      const statusData = await statusRes.json()
      if (!statusRes.ok) throw new Error(statusData.message || 'Failed to mark delivered')

      onSuccess(order._id, 'delivered', proofImageUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Delivery Confirmation</h2>
            <p className="mt-0.5 text-xs text-gray-500">{order.orderNumber} — {order.deliveryAddress?.fullName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Photo capture */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Proof of Delivery (optional)</p>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="proof" className="w-full h-40 object-cover rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={() => { setPreview(null); setFile(null) }}
                  className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-6 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
              >
                <Camera size={20} />
                Take Photo / Choose from Gallery
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={uploading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {uploading
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <SealCheck size={16} weight="fill" />}
              {uploading ? 'Confirming…' : 'Mark Delivered'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Failure Reason Modal ─────────────────────────────────────────────────────

function FailureModal({ order, token, onClose, onSuccess }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const REASONS = ['Customer not available', 'Wrong address', 'Customer refused delivery', 'Package damaged', 'Other']

  const handleConfirm = async () => {
    if (!reason.trim()) { setError('Please provide a reason'); return }
    setSaving(true)
    setError('')
    try {
      await fetch(buildApiUrl(API_PATHS.orders.proof.replace(':id', order._id)), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ failureReason: reason }),
      })

      const res = await fetch(buildApiUrl(API_PATHS.orders.updateStatus.replace(':id', order._id)), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderStatus: 'failed_delivery' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      onSuccess(order._id, 'failed_delivery', reason)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Mark as Failed</h2>
            <p className="mt-0.5 text-xs text-gray-500">{order.orderNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Reason for failure</p>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${reason === r ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            {reason === 'Other' && (
              <textarea
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                rows={2}
                placeholder="Describe the issue…"
                value={reason === 'Other' ? '' : reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {saving
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <XCircle size={16} weight="fill" />}
              {saving ? 'Saving…' : 'Confirm Failed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, token, onStatusChange }) {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [showProofModal, setShowProofModal] = useState(false)
  const [showFailModal, setShowFailModal] = useState(false)

  const updateStatus = async (newStatus) => {
    setUpdating(true)
    setError('')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.updateStatus.replace(':id', order._id)), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderStatus: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      onStatusChange(order._id, newStatus)
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleReject = async () => {
    if (!window.confirm('Reject this delivery? The order will return to the queue.')) return
    setUpdating(true)
    setError('')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.rejectDelivery.replace(':id', order._id)), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      onStatusChange(order._id, 'rejected')
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const status = order.orderStatus
  const isActive = ['confirmed', 'processing', 'shipped'].includes(status)
  const isDelivered = status === 'delivered'
  const isFailed = status === 'failed_delivery'
  const isCancelled = status === 'cancelled'

  return (
    <>
      {showProofModal && (
        <ProofModal
          order={order}
          token={token}
          onClose={() => setShowProofModal(false)}
          onSuccess={(id, newStatus, proofUrl) => {
            setShowProofModal(false)
            onStatusChange(id, newStatus, proofUrl)
          }}
        />
      )}
      {showFailModal && (
        <FailureModal
          order={order}
          token={token}
          onClose={() => setShowFailModal(false)}
          onSuccess={(id, newStatus) => {
            setShowFailModal(false)
            onStatusChange(id, newStatus)
          }}
        />
      )}

      <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className={`flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3 ${isFailed ? 'bg-rose-50' : isDelivered ? 'bg-emerald-50' : ''}`}>
          <span className="font-mono text-xs font-semibold text-gray-700">{order.orderNumber}</span>
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status] || status}
          </span>
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${order.paymentMethod === 'cod' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
            {order.paymentMethod === 'cod' ? '💰 COD' : '✓ Paid'}
          </span>
          <span className="ml-auto text-xs text-gray-400">{fmtDate(order.createdAt)}</span>
        </div>

        <div className="p-4 space-y-3">
          {/* Customer info */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Customer</p>
              <p className="mt-0.5 font-semibold text-gray-900">{order.deliveryAddress?.fullName}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                href={`tel:${order.deliveryAddress?.phone}`}
                className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Phone size={12} weight="fill" className="text-emerald-600" />
                Call
              </a>
              <a
                href={buildMapsUrl(order.deliveryAddress || {})}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <MapPin size={12} weight="fill" className="text-blue-600" />
                Navigate
              </a>
            </div>
          </div>

          {/* Address */}
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <MapPin size={11} className="inline mr-1 text-amber-500" weight="fill" />
            {order.deliveryAddress?.addressLine}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} – {order.deliveryAddress?.pincode}
          </div>

          {/* Items */}
          <div className="flex flex-wrap gap-1.5">
            {order.items?.map((item, i) => (
              <span key={i} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                {item.name} × {item.quantity}
              </span>
            ))}
          </div>

          {/* Total + COD note */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Order Total</p>
              <p className="text-xl font-bold text-gray-900">₹{Number(order.totalAmount).toFixed(2)}</p>
              {order.paymentMethod === 'cod' && isActive && (
                <p className="text-xs font-medium text-amber-600">Collect cash on delivery</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Your Earning</p>
              <p className="text-lg font-bold text-emerald-600">₹{DELIVERY_FEE}</p>
            </div>
          </div>

          {/* Proof image if delivered */}
          {isDelivered && order.deliveryProofImage && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Delivery Proof</p>
              <img src={order.deliveryProofImage} alt="proof" className="h-24 w-full rounded-lg object-cover border border-gray-200" />
            </div>
          )}

          {/* Failure reason if failed */}
          {isFailed && order.failureReason && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <Warning size={12} className="inline mr-1" weight="fill" />
              {order.failureReason}
            </div>
          )}

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          {/* Action buttons */}
          {isActive && (
            <div className="flex flex-wrap gap-2 pt-1">
              {/* Accept (confirmed → processing) */}
              {status === 'confirmed' && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => updateStatus('processing')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {updating ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckCircle size={13} weight="fill" />}
                  Accept Delivery
                </button>
              )}

              {/* Pickup (processing → shipped) */}
              {status === 'processing' && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => updateStatus('shipped')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {updating ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Truck size={13} weight="fill" />}
                  Confirm Pickup
                </button>
              )}

              {/* Deliver (shipped → delivered) */}
              {status === 'shipped' && (
                <button
                  type="button"
                  onClick={() => setShowProofModal(true)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <SealCheck size={13} weight="fill" />
                  Mark Delivered
                </button>
              )}

              {/* Reject (only for confirmed/processing) */}
              {['confirmed', 'processing'].includes(status) && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={handleReject}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  <ArrowCounterClockwise size={13} />
                  Reject
                </button>
              )}

              {/* Failed delivery (only for shipped) */}
              {status === 'shipped' && (
                <button
                  type="button"
                  onClick={() => setShowFailModal(true)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <XCircle size={13} weight="fill" />
                  Failed Delivery
                </button>
              )}
            </div>
          )}

          {isDelivered && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <SealCheck size={16} weight="fill" className="text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-700">Delivered successfully · ₹{DELIVERY_FEE} earned</p>
            </div>
          )}

          {isCancelled && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <XCircle size={16} weight="fill" className="text-gray-400" />
              <p className="text-xs font-medium text-gray-500">Order cancelled by admin or customer</p>
            </div>
          )}
        </div>
      </article>
    </>
  )
}

// ─── Home Section ─────────────────────────────────────────────────────────────

function HomeSection({ orders, analytics, loading, deliveryUser, onSectionChange }) {
  const activeOrders = useMemo(() => orders.filter((o) => ['confirmed', 'processing', 'shipped'].includes(o.orderStatus)), [orders])
  const todayDelivered = analytics?.todayDelivered ?? 0

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Overview</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Welcome back, {deliveryUser?.username}</h2>
        <p className="mt-0.5 text-sm text-gray-500">Here's your delivery summary for today.</p>
      </div>

      {loading && <div className="flex justify-center py-8"><span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" /></div>}

      {!loading && analytics && (
        <>
          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Package} iconBg="bg-amber-50" iconColor="text-amber-600" label="Active Orders" value={analytics.activeOrders} sub="Assigned to you" />
            <StatCard icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Today Delivered" value={todayDelivered} sub={`₹${todayDelivered * DELIVERY_FEE} earned`} />
            <StatCard icon={Wallet} iconBg="bg-blue-50" iconColor="text-blue-600" label="This Week" value={analytics.weekDelivered} sub={`₹${analytics.weekEarnings} earned`} />
            <StatCard icon={ChartBar} iconBg="bg-violet-50" iconColor="text-violet-600" label="Total Delivered" value={analytics.totalDelivered} sub={`₹${analytics.totalEarnings} lifetime`} />
          </div>

          {/* Active orders preview */}
          {activeOrders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Active Deliveries</h3>
                <button type="button" onClick={() => onSectionChange('orders')} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  View all <CaretRight size={11} />
                </button>
              </div>
              <div className="space-y-2">
                {activeOrders.slice(0, 2).map((o) => (
                  <div key={o._id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div>
                      <p className="text-xs font-mono font-semibold text-gray-700">{o.orderNumber}</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{o.deliveryAddress?.fullName}</p>
                      <p className="text-xs text-gray-500">{o.deliveryAddress?.city}</p>
                    </div>
                    <div className="text-right">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[o.orderStatus]}`}>
                        {STATUS_LABELS[o.orderStatus]}
                      </span>
                      <p className="mt-1 text-sm font-bold text-gray-900">₹{Number(o.totalAmount).toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeOrders.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center">
              <Package size={32} weight="thin" className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-500">No active deliveries right now</p>
              <p className="mt-1 text-xs text-gray-400">New assignments will appear here</p>
            </div>
          )}

          {/* Weekly chart preview */}
          {analytics.weeklyStats && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">This Week's Earnings</h3>
              <EarningsBarChart data={analytics.weeklyStats} />
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>Last 7 days · ₹{DELIVERY_FEE}/delivery</span>
                <button type="button" onClick={() => onSectionChange('earnings')} className="text-blue-600 hover:underline">
                  Details →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ─── Orders Section ───────────────────────────────────────────────────────────

function OrdersSection({ orders, setOrders, token }) {
  const [tab, setTab] = useState('active')

  const handleStatusChange = (id, newStatus, extraData) => {
    if (newStatus === 'rejected') {
      setOrders((prev) => prev.filter((o) => o._id !== id))
      return
    }
    setOrders((prev) =>
      prev.map((o) => {
        if (o._id !== id) return o
        return {
          ...o,
          orderStatus: newStatus,
          ...(extraData && typeof extraData === 'string' ? { deliveryProofImage: extraData } : {}),
        }
      }),
    )
  }

  const activeOrders = useMemo(() => orders.filter((o) => ['confirmed', 'processing', 'shipped'].includes(o.orderStatus)), [orders])
  const deliveredOrders = useMemo(() => orders.filter((o) => o.orderStatus === 'delivered'), [orders])
  const failedOrders = useMemo(() => orders.filter((o) => o.orderStatus === 'failed_delivery'), [orders])
  const allOrders = orders

  const tabConfig = [
    { key: 'active', label: 'Active', count: activeOrders.length },
    { key: 'delivered', label: 'Delivered', count: deliveredOrders.length },
    { key: 'failed', label: 'Failed', count: failedOrders.length },
    { key: 'all', label: 'All', count: allOrders.length },
  ]

  const displayed = tab === 'active' ? activeOrders : tab === 'delivered' ? deliveredOrders : tab === 'failed' ? failedOrders : allOrders

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">My Deliveries</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Order Management</h2>
        <p className="mt-0.5 text-sm text-gray-500">Accept, track, and complete your deliveries.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabConfig.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tab === key ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
          >
            {label}
            {count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === key ? 'bg-white/20' : 'bg-gray-100'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
          <Package size={36} weight="thin" className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">
            {tab === 'active' ? 'No active deliveries' : tab === 'delivered' ? 'No completed deliveries yet' : tab === 'failed' ? 'No failed deliveries' : 'No deliveries assigned yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((order) => (
            <OrderCard key={order._id} order={order} token={token} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Earnings Section ─────────────────────────────────────────────────────────

function EarningsSection({ analytics }) {
  if (!analytics) return <div className="flex justify-center py-16"><span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" /></div>

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Finance</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">My Earnings</h2>
        <p className="mt-0.5 text-sm text-gray-500">₹{DELIVERY_FEE} per delivered order. Updated in real time.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Today</p>
          <p className="mt-1.5 text-2xl font-bold text-amber-600">₹{analytics.todayEarnings}</p>
          <p className="mt-0.5 text-xs text-gray-500">{analytics.todayDelivered} deliveries</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">This Week</p>
          <p className="mt-1.5 text-2xl font-bold text-blue-600">₹{analytics.weekEarnings}</p>
          <p className="mt-0.5 text-xs text-gray-500">{analytics.weekDelivered} deliveries</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">This Month</p>
          <p className="mt-1.5 text-2xl font-bold text-violet-600">₹{analytics.monthEarnings}</p>
          <p className="mt-0.5 text-xs text-gray-500">{analytics.monthDelivered} deliveries</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Total Earned</p>
          <p className="mt-1.5 text-2xl font-bold text-emerald-700">₹{analytics.totalEarnings}</p>
          <p className="mt-0.5 text-xs text-emerald-600">{analytics.totalDelivered} total deliveries</p>
        </div>
      </div>

      {/* Weekly chart */}
      {analytics.weeklyStats && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily Earnings — Last 7 Days</h3>
          <EarningsBarChart data={analytics.weeklyStats} />
          <div className="mt-4 border-t border-gray-100 pt-3 grid grid-cols-7 gap-1">
            {analytics.weeklyStats.map((d, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] text-gray-400">{d.date}</p>
                <p className="text-[11px] font-semibold text-gray-700">{d.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent earnings history */}
      {analytics.recentEarnings && analytics.recentEarnings.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {analytics.recentEarnings.map((e) => (
              <div key={String(e.orderId)} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-xs font-mono font-semibold text-gray-700">{e.orderNumber}</p>
                  <p className="text-xs text-gray-500">{e.customerName} · {fmtDate(e.date)}</p>
                </div>
                <p className="text-sm font-bold text-emerald-600">+₹{e.amount}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.recentEarnings?.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center">
          <Wallet size={32} weight="thin" className="mx-auto text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No earnings yet</p>
          <p className="mt-1 text-xs text-gray-400">Complete deliveries to earn ₹{DELIVERY_FEE} per order</p>
        </div>
      )}

      {/* Note */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
        <p className="font-semibold text-gray-700 mb-1">Earnings Info</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Flat rate of ₹{DELIVERY_FEE} per successfully delivered order.</li>
          <li>Failed deliveries, cancellations, and rejected orders are not counted.</li>
          <li>Payouts are processed weekly by the admin team.</li>
        </ul>
      </div>
    </section>
  )
}

// ─── Availability Section ─────────────────────────────────────────────────────

function AvailabilitySection({ deliveryUser, setDeliveryUser, token }) {
  const [status, setStatus] = useState(deliveryUser?.deliveryStatus || 'offline')
  const [shiftStart, setShiftStart] = useState(deliveryUser?.shiftStart || '')
  const [shiftEnd, setShiftEnd] = useState(deliveryUser?.shiftEnd || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(buildApiUrl(API_PATHS.delivery.availability), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deliveryStatus: status, shiftStart, shiftEnd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update')
      const updated = { ...deliveryUser, deliveryStatus: data.deliveryStatus, shiftStart: data.shiftStart, shiftEnd: data.shiftEnd }
      setDeliveryUser(updated)
      localStorage.setItem('authUser', JSON.stringify(updated))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Status</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Availability</h2>
        <p className="mt-0.5 text-sm text-gray-500">Set your current status and shift timing.</p>
      </div>

      {/* Status toggle */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Current Status</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { key: 'online', label: 'Online', desc: 'Ready to accept deliveries', color: 'border-emerald-400 bg-emerald-50', selected: 'ring-emerald-400', icon: WifiHigh, iconColor: 'text-emerald-600' },
            { key: 'break', label: 'On Break', desc: 'Temporarily unavailable', color: 'border-amber-400 bg-amber-50', selected: 'ring-amber-400', icon: Coffee, iconColor: 'text-amber-600' },
            { key: 'offline', label: 'Offline', desc: 'Not accepting deliveries', color: 'border-gray-400 bg-gray-50', selected: 'ring-gray-400', icon: WifiSlash, iconColor: 'text-gray-500' },
          ].map(({ key, label, desc, color, selected, icon: Icon, iconColor }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${status === key ? `${color} ring-2 ${selected}` : 'border-gray-200 hover:border-gray-300'}`}
            >
              <Icon size={20} className={status === key ? iconColor : 'text-gray-400'} weight="fill" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Shift timing */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Shift Timing</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Shift Start</label>
            <input
              type="time"
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Shift End</label>
            <input
              type="time"
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
        </div>
        {shiftStart && shiftEnd && (
          <p className="text-xs text-gray-500">
            Active hours: {shiftStart} – {shiftEnd}
          </p>
        )}
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {saved && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Availability updated successfully!
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
      >
        {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckCircle size={16} weight="fill" />}
        {saving ? 'Saving…' : 'Save Availability'}
      </button>
    </section>
  )
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection({ deliveryUser, analytics, handleLogout }) {
  if (!deliveryUser) return null

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Account</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">My Profile</h2>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-700">
            {deliveryUser.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{deliveryUser.username}</p>
            <p className="text-sm text-gray-500">{deliveryUser.email}</p>
            <div className="mt-1">
              <AvailabilityBadge status={deliveryUser.deliveryStatus || 'offline'} />
            </div>
          </div>
        </div>

        <div className="mt-5 divide-y divide-gray-100">
          {[
            { label: 'Phone', value: deliveryUser.phone || '—' },
            { label: 'Vehicle Number', value: deliveryUser.vehicleNumber || '—' },
            { label: 'Role', value: 'Delivery Partner' },
            { label: 'Account Status', value: deliveryUser.isBlocked ? 'Suspended' : 'Active' },
            { label: 'Shift', value: deliveryUser.shiftStart && deliveryUser.shiftEnd ? `${deliveryUser.shiftStart} – ${deliveryUser.shiftEnd}` : 'Not set' },
            { label: 'Member Since', value: deliveryUser.createdAt ? fmtDate(deliveryUser.createdAt) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-sm font-medium text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance summary */}
      {analytics && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Performance Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalDelivered}</p>
              <p className="text-xs text-gray-500 mt-0.5">Delivered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{analytics.totalFailed}</p>
              <p className="text-xs text-gray-500 mt-0.5">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {analytics.totalDelivered + analytics.totalFailed > 0
                  ? Math.round((analytics.totalDelivered / (analytics.totalDelivered + analytics.totalFailed)) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Success Rate</p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
      >
        <SignOut size={16} />
        Sign Out
      </button>
    </section>
  )
}

// ─── Notifications Section ────────────────────────────────────────────────────

function NotificationsSection({ orders }) {
  const newAssignments = useMemo(
    () => orders.filter((o) => o.orderStatus === 'confirmed'),
    [orders],
  )
  const recentUpdates = useMemo(
    () => orders.filter((o) => ['processing', 'shipped'].includes(o.orderStatus)),
    [orders],
  )

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Alerts</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Notifications</h2>
      </div>

      {newAssignments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">New Assignments ({newAssignments.length})</h3>
          <div className="space-y-2">
            {newAssignments.map((o) => (
              <div key={o._id} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <Bell size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">New delivery assigned</p>
                  <p className="text-xs text-gray-600 mt-0.5">{o.orderNumber} · {o.deliveryAddress?.fullName} · {o.deliveryAddress?.city}</p>
                  <p className="text-xs text-gray-500 mt-0.5">₹{Number(o.totalAmount).toFixed(0)} · {o.paymentMethod === 'cod' ? 'Collect cash' : 'Already paid'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentUpdates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">In Progress ({recentUpdates.length})</h3>
          <div className="space-y-2">
            {recentUpdates.map((o) => (
              <div key={o._id} className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <Truck size={18} weight="fill" className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{o.orderStatus === 'processing' ? 'Heading to pickup' : 'Out for delivery'}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{o.orderNumber} · {o.deliveryAddress?.fullName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {newAssignments.length === 0 && recentUpdates.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
          <Bell size={32} weight="thin" className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No new notifications</p>
        </div>
      )}
    </section>
  )
}

// ─── Main Delivery Portal ─────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'earnings', label: 'Earnings', icon: Wallet },
  { key: 'availability', label: 'Availability', icon: WifiHigh },
  { key: 'notifications', label: 'Alerts', icon: Bell },
  { key: 'profile', label: 'Profile', icon: User },
]

function DeliveryDashboard() {
  const navigate = useNavigate()
  const [deliveryUser, setDeliveryUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [section, setSection] = useState('home')
  const [orders, setOrders] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const token = localStorage.getItem('authToken')

  // Auth check
  useEffect(() => {
    const stored = localStorage.getItem('authUser')
    if (!stored) { navigate('/login', { replace: true }); return }
    try {
      const parsed = JSON.parse(stored)
      if (parsed?.role !== 'delivery') { navigate('/', { replace: true }); return }
      setDeliveryUser(parsed)
      setIsCheckingAuth(false)
    } catch {
      localStorage.removeItem('authUser')
      localStorage.removeItem('authToken')
      navigate('/login', { replace: true })
    }
  }, [navigate])

  // Fetch orders + analytics
  useEffect(() => {
    if (!deliveryUser || !token) return
    setLoading(true)

    Promise.all([
      fetch(buildApiUrl(API_PATHS.orders.deliveryOrders), { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(buildApiUrl(API_PATHS.delivery.analytics), { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([ordersData, analyticsData]) => {
        if (ordersData.orders) setOrders(ordersData.orders)
        if (analyticsData.analytics) setAnalytics(analyticsData.analytics)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [deliveryUser, token])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    navigate('/login', { replace: true })
  }

  const newNotifCount = useMemo(
    () => orders.filter((o) => o.orderStatus === 'confirmed').length,
    [orders],
  )

  if (isCheckingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-50">
        <div className="text-center">
          <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Verifying access…</p>
        </div>
      </main>
    )
  }

  if (!deliveryUser) return null

  const renderSection = () => {
    switch (section) {
      case 'home':
        return <HomeSection orders={orders} analytics={analytics} loading={loading} deliveryUser={deliveryUser} onSectionChange={setSection} />
      case 'orders':
        return <OrdersSection orders={orders} setOrders={setOrders} token={token} />
      case 'earnings':
        return <EarningsSection analytics={analytics} />
      case 'availability':
        return <AvailabilitySection deliveryUser={deliveryUser} setDeliveryUser={setDeliveryUser} token={token} />
      case 'notifications':
        return <NotificationsSection orders={orders} />
      case 'profile':
        return <ProfileSection deliveryUser={deliveryUser} analytics={analytics} handleLogout={handleLogout} />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
            <Truck size={18} className="text-amber-600" weight="fill" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Delivery</p>
            <p className="text-sm font-bold text-gray-900 truncate max-w-[100px]">{deliveryUser.username}</p>
          </div>
        </div>

        {/* Availability badge */}
        <div className="px-4 py-3 border-b border-gray-100">
          <AvailabilityBadge status={deliveryUser.deliveryStatus || 'offline'} />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = section === key
            const badge = key === 'notifications' && newNotifCount > 0 ? newNotifCount : null
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                {label}
                {badge && (
                  <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-100 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600"
          >
            <SignOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar (mobile header) */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <Truck size={15} className="text-amber-600" weight="fill" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Delivery Portal</p>
              <p className="text-sm font-bold text-gray-900 leading-none">{deliveryUser.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AvailabilityBadge status={deliveryUser.deliveryStatus || 'offline'} />
            <button
              type="button"
              onClick={() => setSection('notifications')}
              className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <Bell size={18} />
              {newNotifCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                  {newNotifCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto max-w-3xl">
            {renderSection()}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white lg:hidden">
          <div className="flex">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
              const isActive = section === key
              const badge = key === 'notifications' && newNotifCount > 0 ? newNotifCount : null
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSection(key)}
                  className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
                >
                  {badge && (
                    <span className="absolute right-1/4 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  {label}
                  {isActive && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-gray-900" />}
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

export default DeliveryDashboard
