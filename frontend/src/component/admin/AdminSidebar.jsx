import { ChartPieSlice, SignOut, SquaresFour, Users, FolderPlus, Tag, Package, ClipboardText, Truck } from '@phosphor-icons/react'

function AdminSidebar({ authUser, usersCount, ordersCount, deliveryPartnersCount, activeSection, onSectionChange, onLogout }) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: SquaresFour },
    { id: 'orders', label: 'Orders', icon: ClipboardText, count: ordersCount },
    { id: 'delivery-partners', label: 'Delivery Partners', icon: Truck, count: deliveryPartnersCount },
    { id: 'users', label: 'Users', icon: Users, count: usersCount },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'subcategories', label: 'SubCategories', icon: FolderPlus },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'insights', label: 'Insights', icon: ChartPieSlice },
  ]

  return (
    <aside className="flex h-full flex-col border-r border-emerald-100 bg-white/90 backdrop-blur">
      <div className="border-b border-emerald-100 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Admin Workspace</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Shubham Supermarket</h1>
      </div>

      <div className="px-4 py-5">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-lime-50 p-4">
          <p className="text-sm font-bold text-slate-900">{authUser?.username || 'Admin'}</p>
          <p className="mt-1 truncate text-xs text-slate-600">{authUser?.email}</p>
        </div>

        <nav className="mt-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} weight="bold" />
                  {item.label}
                </span>

                {typeof item.count === 'number' ? (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                    {item.count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-emerald-100 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          <SignOut size={18} weight="bold" />
          Logout
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar