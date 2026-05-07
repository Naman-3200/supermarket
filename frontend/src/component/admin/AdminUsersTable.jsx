import { MagnifyingGlass } from '@phosphor-icons/react'

const ROLE_STYLES = {
  admin: 'bg-violet-50 text-violet-700 border border-violet-200',
  delivery: 'bg-amber-50 text-amber-700 border border-amber-200',
  user: 'bg-gray-100 text-gray-600 border border-gray-200',
}

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function renderRows(isLoading, error, users) {
  if (isLoading) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
        </td>
      </tr>
    )
  }
  if (error) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-8 text-center text-sm text-red-600">{error}</td>
      </tr>
    )
  }
  if (!users.length) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No users found.</td>
      </tr>
    )
  }
  return users.map((user) => (
    <tr key={user.id} className="transition-colors hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
      <td className="px-4 py-3 text-gray-600">{user.email}</td>
      <td className="px-4 py-3 text-gray-600">{user.phone || '—'}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[user.role] || ROLE_STYLES.user}`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
    </tr>
  ))
}

function AdminUsersTable({ users, query, onQueryChange, isLoading, error }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Directory</p>
          <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Registered Users</h2>
        </div>
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {renderRows(isLoading, error, users)}
            </tbody>
          </table>
        </div>
        {users.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5">
            <p className="text-xs text-gray-400">{users.length} user{users.length !== 1 ? 's' : ''} shown</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminUsersTable
