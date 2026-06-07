import { useEffect, useState } from 'react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function AdminSettings() {
  const [deliveryCharge, setDeliveryCharge] = useState('')
  const [freeThreshold, setFreeThreshold] = useState('')
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(true)
  const [businessRadius, setBusinessRadius] = useState('10')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const token = localStorage.getItem('authToken')

  useEffect(() => {
    fetch(buildApiUrl(API_PATHS.settings.get))
      .then((r) => r.json())
      .then((d) => {
        setDeliveryCharge(String(d.deliveryCharge ?? 40))
        setFreeThreshold(String(d.freeDeliveryThreshold ?? 499))
        setFreeDeliveryEnabled(d.freeDeliveryEnabled !== false)
        setBusinessRadius(String(d.businessRadius ?? 10))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.settings.update), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          deliveryCharge: Number(deliveryCharge),
          freeDeliveryThreshold: Number(freeThreshold),
          freeDeliveryEnabled,
          businessRadius: Number(businessRadius),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save settings')
      setDeliveryCharge(String(data.deliveryCharge ?? deliveryCharge))
      setFreeThreshold(String(data.freeDeliveryThreshold ?? freeThreshold))
      if (data.freeDeliveryEnabled !== undefined) setFreeDeliveryEnabled(data.freeDeliveryEnabled)
      if (data.businessRadius !== undefined) setBusinessRadius(String(data.businessRadius))
      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5 max-w-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Configuration</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Store Settings</h2>
        <p className="mt-0.5 text-sm text-gray-500">Configure delivery charges, radius, and store preferences.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">

          {/* Delivery Charge Settings */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">Delivery Charge Settings</h3>

            {/* Free Delivery Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Delivery Charges</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {freeDeliveryEnabled ? 'Enabled — delivery fee applies below threshold' : 'Disabled — free delivery on all orders'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFreeDeliveryEnabled((v) => !v)}
                className="flex items-center gap-2 text-sm font-semibold transition-colors"
              >
                <span className={`text-xs font-bold ${freeDeliveryEnabled ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {freeDeliveryEnabled ? 'ON' : 'OFF'}
                </span>
                <span className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${freeDeliveryEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${freeDeliveryEnabled ? 'left-5' : 'left-0.5'}`} />
                </span>
              </button>
            </div>

            {freeDeliveryEnabled && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5" htmlFor="dc">
                    Delivery Charge (₹)
                  </label>
                  <input
                    id="dc"
                    type="number"
                    min="0"
                    step="1"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                  <p className="mt-1 text-xs text-gray-400">Charged on orders below the free delivery threshold.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5" htmlFor="ft">
                    Free Delivery Threshold (₹)
                  </label>
                  <input
                    id="ft"
                    type="number"
                    min="0"
                    step="1"
                    value={freeThreshold}
                    onChange={(e) => setFreeThreshold(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                  <p className="mt-1 text-xs text-gray-400">Orders at or above this amount get free delivery.</p>
                </div>
              </>
            )}

            {!freeDeliveryEnabled && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                Free delivery is enabled for all orders regardless of order amount.
              </div>
            )}

            {freeDeliveryEnabled && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                Current: Delivery = ₹{deliveryCharge} | Free above ₹{freeThreshold}
              </div>
            )}
          </div>

          {/* Business Radius */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
              📍 Business Delivery Radius
            </h3>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5" htmlFor="radius">
                Delivery Radius (km)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="radius"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={businessRadius}
                  onChange={(e) => setBusinessRadius(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
                <span className="shrink-0 text-sm font-medium text-gray-600">km</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[5, 10, 15, 20, 25].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setBusinessRadius(String(km))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${Number(businessRadius) === km ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {km} km
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Orders will only be accepted from addresses within {businessRadius} km of your store.
              </p>
            </div>
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      )}
    </section>
  )
}

export default AdminSettings
