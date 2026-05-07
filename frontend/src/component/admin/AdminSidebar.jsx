import { ChartPieSlice, SignOut, SquaresFour, Users, FolderPlus, Tag, Package, ClipboardText, Truck } from '@phosphor-icons/react'

function AdminSidebar({ authUser, usersCount, ordersCount, deliveryPartnersCount, activeSection, onSectionChange, onLogout }) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: SquaresFour },
    { id: 'orders', label: 'Orders', icon: ClipboardText, count: ordersCount },
    { id: 'delivery-partners', label: 'Delivery', icon: Truck, count: deliveryPartnersCount },
    { id: 'users', label: 'Users', icon: Users, count: usersCount },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'subcategories', label: 'Sub-Categories', icon: FolderPlus },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'insights', label: 'Insights', icon: ChartPieSlice },
  ]

  const initials = (authUser?.username?.[0] || 'A').toUpperCase()

  return (
    <aside className="flex h-full flex-col bg-gray-900">
      {/* Brand */}
      <div className="border-b border-gray-800 px-6 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Admin Panel</p>
        <h1 className="mt-1 text-base font-semibold text-white leading-tight">Shubham Supermarket</h1>
      </div>

      {/* User profile */}
      <div className="border-b border-gray-800 px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg bg-gray-800 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white select-none">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{authUser?.username || 'Admin'}</p>
            <p className="truncate text-xs text-gray-400">{authUser?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Navigation</p>
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} weight={isActive ? 'fill' : 'regular'} />
                    {item.label}
                  </span>
                  {typeof item.count === 'number' && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="border-t border-gray-800 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
        >
          <SignOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar
