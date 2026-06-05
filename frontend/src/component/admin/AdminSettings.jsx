import { useEffect, useState } from 'react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function AdminSettings() {
  const [deliveryCharge, setDeliveryCharge] = useState('')
  const [freeThreshold, setFreeThreshold] = useState('')
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save settings')
      setDeliveryCharge(String(data.deliveryCharge))
      setFreeThreshold(String(data.freeDeliveryThreshold))
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
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Delivery Charge Settings</h2>
        <p className="mt-0.5 text-sm text-gray-500">Set the delivery fee and free delivery threshold for all orders.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
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

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
            Current: Delivery = ₹{deliveryCharge} | Free above ₹{freeThreshold}
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
