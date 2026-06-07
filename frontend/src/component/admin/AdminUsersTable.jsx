import { useEffect, useState, useMemo, useCallback } from 'react'
import { MagnifyingGlass, Pencil, Trash, X, Check, LockSimple, LockSimpleOpen, Eye, Package, Wallet, Truck, Star } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const ROLE_STYLES = {
  admin: 'bg-violet-50 text-violet-700 border border-violet-200',
  delivery: 'bg-amber-50 text-amber-700 border border-amber-200',
  user: 'bg-gray-100 text-gray-600 border border-gray-200',
}

function fmt(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DetailModal({ user, onClose }) {
  const isDelivery = user.role === 'delivery'
  const token = localStorage.getItem('authToken')
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    fetch(buildApiUrl(API_PATHS.orders.all), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const all = d.orders || []
        if (isDelivery) {
          setOrders(all.filter((o) => {
            const pid = o.assignedDeliveryPartner?._id || o.assignedDeliveryPartner
            return pid === user.id || pid === user._id
          }))
        } else {
          setOrders(all.filter((o) => {
            const uid = o.userId?._id || o.userId || o.user?._id || o.user
            return uid === user.id || uid === user._id
          }))
        }
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false))
  }, [user.id, user._id, isDelivery, token])

  const totalOrders = orders.length
  const deliveredOrders = orders.filter((o) => o.orderStatus === 'delivered').length
  const totalSpent = orders.filter((o) => o.orderStatus === 'delivered').reduce((s, o) => s + Number(o.totalAmount || 0), 0)
  const totalEarnings = isDelivery
    ? orders.filter((o) => o.orderStatus === 'delivered').reduce((s, o) => s + Number(o.deliveryEarnings || 0), 0)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">{isDelivery ? 'Delivery Partner Details' : 'Customer Details'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{user.username}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span className={`mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[user.role] || ROLE_STYLES.user}`}>{user.role}</span>
            </div>
          </div>

          {/* Stats cards */}
          <div className={`grid gap-3 ${isDelivery ? 'grid-cols-3' : 'grid-cols-3'}`}>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <Package size={16} className="mx-auto mb-1 text-blue-500" weight="fill" />
              <p className="text-lg font-bold text-gray-900">{ordersLoading ? '…' : totalOrders}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Orders</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
              <Star size={16} className="mx-auto mb-1 text-emerald-500" weight="fill" />
              <p className="text-lg font-bold text-emerald-700">{ordersLoading ? '…' : deliveredOrders}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Delivered</p>
            </div>
            {isDelivery ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <Truck size={16} className="mx-auto mb-1 text-amber-500" weight="fill" />
                <p className="text-lg font-bold text-amber-700">{ordersLoading ? '…' : `₹${totalEarnings.toFixed(0)}`}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Earned</p>
              </div>
            ) : (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
                <Wallet size={16} className="mx-auto mb-1 text-violet-500" weight="fill" />
                <p className="text-lg font-bold text-violet-700">{ordersLoading ? '…' : `₹${totalSpent.toFixed(0)}`}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Spent</p>
              </div>
            )}
          </div>

          {/* Contact & Basic Info */}
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
            {[
              { label: 'Phone', value: user.phone || '—' },
              { label: 'Account Status', value: user.isBlocked ? 'Blocked' : 'Active', highlight: user.isBlocked ? 'text-red-600' : 'text-emerald-600' },
              { label: 'Joined', value: fmt(user.createdAt) },
              ...(isDelivery ? [
                { label: 'Vehicle Number', value: user.vehicleNumber || '—' },
                { label: 'Delivery Status', value: user.deliveryStatus || 'offline', highlight: user.deliveryStatus === 'online' ? 'text-emerald-600' : user.deliveryStatus === 'break' ? 'text-amber-600' : 'text-gray-500' },
                { label: 'Shift', value: user.shiftStart && user.shiftEnd ? `${user.shiftStart} – ${user.shiftEnd}` : '—' },
              ] : []),
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-gray-500">{label}</p>
                <p className={`text-sm font-medium ${highlight || 'text-gray-900'}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Wallet */}
          {!isDelivery && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1">Wallet Balance</p>
              <p className="text-2xl font-bold text-emerald-700">₹{Number(user.wallet?.balance || 0).toFixed(2)}</p>
            </div>
          )}

          {/* Delivery partner wallet/earnings */}
          {isDelivery && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">Wallet Balance</p>
              <p className="text-2xl font-bold text-amber-700">₹{Number(user.wallet?.balance || 0).toFixed(2)}</p>
            </div>
          )}

          {/* Recent orders */}
          {!ordersLoading && orders.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Recent Orders ({orders.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {orders.slice(0, 8).map((o) => (
                  <div key={o._id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                    <div>
                      <p className="font-mono font-semibold text-gray-700">{o.orderNumber}</p>
                      <p className="text-gray-500">{fmt(o.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{Number(o.totalAmount).toFixed(2)}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${o.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-700' : o.orderStatus === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {o.orderStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Addresses */}
          {!isDelivery && Array.isArray(user.addresses) && user.addresses.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Saved Addresses ({user.addresses.length})</p>
              <div className="space-y-2">
                {user.addresses.map((addr, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{addr.fullName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${addr.label === 'home' ? 'bg-blue-100 text-blue-700' : addr.label === 'work' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{addr.label}</span>
                      {addr.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Default</span>}
                    </div>
                    <p className="text-gray-600">{addr.addressLine}, {addr.city}, {addr.state} – {addr.pincode}</p>
                    <p className="text-gray-500 text-xs mt-0.5">📞 {addr.phone}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EditModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ username: user.username || '', email: user.email || '', phone: user.phone || '', vehicleNumber: user.vehicleNumber || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const token = localStorage.getItem('authToken')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.auth.update.replace(':id', user.id)), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to update'); setSaving(false); return }
      onSaved(data.user)
    } catch (_) {
      setError('Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Edit User</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          {[
            { id: 'username', label: 'Username', type: 'text' },
            { id: 'email', label: 'Email', type: 'email' },
            { id: 'phone', label: 'Phone', type: 'text' },
          ].map(({ id, label, type }) => (
            <div key={id}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor={`edit-${id}`}>{label}</label>
              <input
                id={`edit-${id}`}
                type={type}
                value={form[id]}
                onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
          ))}
          {user.role === 'delivery' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="edit-vehicle">Vehicle Number</label>
              <input
                id="edit-vehicle"
                type="text"
                value={form.vehicleNumber}
                onChange={(e) => setForm((p) => ({ ...p, vehicleNumber: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
          )}
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60">
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check size={14} weight="bold" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdminUsersTable({ roleFilter }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [viewingUser, setViewingUser] = useState(null)
  const [actionLoading, setActionLoading] = useState('')
  const token = localStorage.getItem('authToken')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const url = roleFilter
        ? `${API_PATHS.auth.users}?role=${roleFilter}`
        : API_PATHS.auth.users
      const res = await fetch(buildApiUrl(url), { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setUsers(Array.isArray(data.users) ? data.users : [])
      else setError(data.message || 'Failed to load users')
    } catch (_) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [token, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.username, u.email, u.phone, u.role].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [users, search])

  const handleToggleBlock = async (user) => {
    if (!confirm(`${user.isBlocked ? 'Unblock' : 'Block'} "${user.username}"?`)) return
    setActionLoading(user.id)
    try {
      const res = await fetch(buildApiUrl(API_PATHS.auth.toggleBlock.replace(':id', user.id)), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isBlocked: data.user.isBlocked } : u)))
      }
    } catch (_) {}
    setActionLoading('')
  }

  const handleDelete = async (user) => {
    if (!confirm(`Permanently delete "${user.username}"? This cannot be undone.`)) return
    setActionLoading(user.id)
    try {
      const res = await fetch(buildApiUrl(API_PATHS.auth.delete.replace(':id', user.id)), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (_) {}
    setActionLoading('')
  }

  const handleSaved = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
    setEditingUser(null)
  }

  const label = roleFilter === 'user' ? 'Customers' : roleFilter === 'delivery' ? 'Delivery Partners' : 'All Users'

  return (
    <section className="space-y-5">
      {editingUser && <EditModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={handleSaved} />}
      {viewingUser && <DetailModal user={viewingUser} onClose={() => setViewingUser(null)} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Directory</p>
          <h2 className="mt-0.5 text-xl font-semibold text-gray-900">{label}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{users.length} registered</p>
        </div>
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                {roleFilter !== 'delivery' && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Wallet</th>}
                {roleFilter === 'delivery' && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Vehicle / Status</th>}
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-400">No users found.</td></tr>
              ) : filtered.map((user) => (
                <tr key={user.id} className={`transition-colors hover:bg-gray-50 ${user.isBlocked ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{user.username}</p>
                    {roleFilter !== 'delivery' && user.addresses?.length > 0 && (
                      <p className="text-xs text-gray-400">{user.addresses.length} address{user.addresses.length !== 1 ? 'es' : ''}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600 text-xs">{user.email}</p>
                    <p className="text-gray-500 text-xs">{user.phone || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[user.role] || ROLE_STYLES.user}`}>
                      {user.role}
                    </span>
                  </td>
                  {roleFilter !== 'delivery' && (
                    <td className="px-4 py-3 text-sm font-medium text-emerald-700">
                      ₹{Number(user.wallet?.balance || 0).toFixed(2)}
                    </td>
                  )}
                  {roleFilter === 'delivery' && (
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>{user.vehicleNumber || '—'}</p>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium mt-0.5 ${user.deliveryStatus === 'online' ? 'bg-emerald-50 text-emerald-700' : user.deliveryStatus === 'break' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {user.deliveryStatus || 'offline'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${user.isBlocked ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {user.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmt(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setViewingUser(user)}
                      className="mr-1 inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      title="View full details"
                    >
                      <Eye size={13} className="mr-1" /> View
                    </button>
                    {user.role !== 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(user)}
                          disabled={actionLoading === user.id}
                          title={user.isBlocked ? 'Unblock' : 'Block'}
                          className={`mr-1 inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${user.isBlocked ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                        >
                          {user.isBlocked ? <LockSimpleOpen size={13} className="mr-1" /> : <LockSimple size={13} className="mr-1" />}
                          {user.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUser(user)}
                          className="mr-1 inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil size={13} className="mr-1" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          disabled={actionLoading === user.id}
                          className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash size={13} className="mr-1" /> Delete
                        </button>
                      </>
                    )}
                    {user.role === 'admin' && <span className="text-xs text-gray-400">Admin</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5">
            <p className="text-xs text-gray-400">{filtered.length} user{filtered.length !== 1 ? 's' : ''} shown</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminUsersTable
