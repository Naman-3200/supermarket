import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminUsersTable from './AdminUsersTable'
import AdminCategories from './AdminCategories'
import AdminSubCategories from './AdminSubCategories'
import AdminProducts from './AdminProducts'
import AdminOrders from './AdminOrders'
import AdminDeliveryPartners from './AdminDeliveryPartners'
import AdminInventory from './AdminInventory'
import AdminCoupons from './AdminCoupons'
import AdminPayments from './AdminPayments'
import AdminReports from './AdminReports'
import AdminSettings from './AdminSettings'
import AdminWithdrawals from './AdminWithdrawals'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

// ─── SVG Chart Components ─────────────────────────────────────────────────────

function BarChart({ data, valuePrefix = '₹', color = '#10b981' }) {
  if (!data || data.length === 0) {
    return <div className="flex h-36 items-center justify-center text-sm text-gray-400">No data available</div>
  }
  const max = Math.max(...data.map((d) => d.value), 1)
  const barW = 36
  const gap = 10
  const svgW = data.length * (barW + gap)
  const chartH = 120
  const labelH = 24

  return (
    <div className="overflow-x-auto">
      <svg width={svgW} height={chartH + labelH} style={{ minWidth: '100%' }}>
        {data.map((d, i) => {
          const bh = Math.max((d.value / max) * chartH, 2)
          const x = i * (barW + gap)
          const y = chartH - bh
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={bh} rx={4} fill={color} opacity={0.85} />
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={8} fill="#6b7280">
                {valuePrefix}{d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
              </text>
              <text x={x + barW / 2} y={chartH + labelH - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">
                {d.shortLabel || d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function LineChart({ data, color = '#6366f1' }) {
  if (!data || data.length === 0) {
    return <div className="flex h-36 items-center justify-center text-sm text-gray-400">No data available</div>
  }
  const max = Math.max(...data.map((d) => d.value), 1)
  const W = 460
  const H = 100
  const labelH = 24
  const pad = 20

  const pts = data.map((d, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (W - 2 * pad),
    y: pad + (1 - d.value / max) * (H - 2 * pad),
  }))

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${pts[0].x},${H} ${polyline} ${pts[pts.length - 1].x},${H}`

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + labelH}`} className="w-full" style={{ minWidth: 280 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#areaGrad)" />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill={color} />
            <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize={8} fill="#6b7280">
              {data[i].value}
            </text>
            <text x={p.x} y={H + labelH - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">
              {data[i].shortLabel || data[i].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function DonutChart({ data }) {
  if (!data || data.length === 0) return null
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = 46
  const circ = 2 * Math.PI * r
  let offset = 0
  const segments = data.map((d) => {
    const pct = d.value / total
    const seg = { ...d, dashArray: `${pct * circ} ${(1 - pct) * circ}`, dashOffset: -(offset * circ) }
    offset += pct
    return seg
  })

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={120} height={120} viewBox="0 0 120 120" className="shrink-0">
        <circle cx={60} cy={60} r={r} fill="none" stroke="#f3f4f6" strokeWidth={18} />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={60}
            cy={60}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={18}
            strokeDasharray={s.dashArray}
            strokeDashoffset={s.dashOffset}
            transform="rotate(-90 60 60)"
          />
        ))}
        <text x={60} y={60} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight="600" fill="#111827">
          {data.length}
        </text>
        <text x={60} y={74} textAnchor="middle" fontSize={7} fill="#9ca3af">cats</text>
      </svg>
      <div className="flex-1 space-y-1.5 min-w-0">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="truncate text-gray-600">{d.name}</span>
            <span className="ml-auto font-semibold text-gray-900 shrink-0">₹{(d.revenue || 0).toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  }
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${colors[color]?.split(' ')[1] || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </article>
  )
}

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const STATUS_COLORS = {
  placed: '#3b82f6',
  confirmed: '#10b981',
  processing: '#f59e0b',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
}

// ─── Analytics / Overview Section ─────────────────────────────────────────────

function OverviewSection({ authUser }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    fetch(buildApiUrl(API_PATHS.analytics.dashboard), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.totals) setStats(data)
        else setError(data.message || 'Failed to load analytics')
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  }

  const t = stats?.totals || {}
  const catData = (stats?.categoryPerformance || []).map((c, i) => ({
    ...c,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  const statusEntries = Object.entries(stats?.orderStatusBreakdown || {}).map(([status, count]) => ({ status, count }))

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-lg font-bold select-none">
          {authUser?.username?.[0]?.toUpperCase() || 'A'}
        </div>
        <div>
          <p className="text-sm text-gray-500">Welcome back</p>
          <h1 className="text-lg font-bold text-gray-900">{authUser?.username}</h1>
        </div>
      </div>

      {/* Primary stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={t.users ?? '—'} sub="All registered accounts" color="blue" />
        <StatCard label="Customers" value={t.customers ?? '—'} sub="Regular customers" color="emerald" />
        <StatCard label="Delivery Partners" value={t.deliveryPartners ?? '—'} sub="Active delivery staff" color="amber" />
        <StatCard label="Total Orders" value={t.orders ?? '—'} sub="All-time orders" color="violet" />
      </div>

      {/* Revenue stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Revenue" value={`₹${(t.revenue || 0).toLocaleString('en-IN')}`} sub="All-time revenue" color="emerald" />
        <StatCard label="Monthly Revenue" value={`₹${(t.monthRevenue || 0).toLocaleString('en-IN')}`} sub={`${t.monthOrders || 0} orders this month`} color="indigo" />
        <StatCard label="Today's Revenue" value={`₹${(t.todayRevenue || 0).toLocaleString('en-IN')}`} sub={`${t.todayOrders || 0} orders today`} color="blue" />
        <StatCard label="Avg. Order Value" value={`₹${(t.avgOrderValue || 0).toLocaleString('en-IN')}`} sub={`${t.conversionRate || 0}% conversion`} color="rose" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Monthly Sales</p>
          <p className="mb-4 text-sm font-semibold text-gray-900">Revenue — Last 6 Months</p>
          <BarChart data={stats?.monthlySales || []} valuePrefix="₹" color="#10b981" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Daily Orders</p>
          <p className="mb-4 text-sm font-semibold text-gray-900">Orders — Last 7 Days</p>
          <LineChart data={(stats?.dailySales || []).map((d) => ({ ...d, value: d.orders }))} color="#6366f1" />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Products */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Top Performers</p>
          <p className="mb-4 text-sm font-semibold text-gray-900">Top 5 Products</p>
          {(stats?.topProducts || []).length === 0 ? (
            <p className="text-sm text-gray-400">No order data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-gray-400 shrink-0">{i + 1}</span>
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} className="h-8 w-8 rounded-md object-cover border border-gray-100 shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-md bg-gray-100 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-900">{p.name}</p>
                    <p className="text-[11px] text-gray-400">{p.totalSold} units sold</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 shrink-0">₹{p.revenue.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Performance */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Category Performance</p>
          <p className="mb-4 text-sm font-semibold text-gray-900">Revenue by Category</p>
          <DonutChart data={catData} />
        </div>

        {/* Order Status Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Order Pipeline</p>
          <p className="mb-4 text-sm font-semibold text-gray-900">Status Breakdown</p>
          {statusEntries.length === 0 ? (
            <p className="text-sm text-gray-400">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {statusEntries.map(({ status, count }) => {
                const total = statusEntries.reduce((s, e) => s + e.count, 0) || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium capitalize text-gray-700">{status}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] || '#9ca3af' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {(stats?.lowStockProducts || []).length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-amber-800">
            Low Stock Alerts — {stats.lowStockProducts.length} product{stats.lowStockProducts.length !== 1 ? 's' : ''} need attention
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-white border border-amber-100 px-3 py-2">
                {p.thumbnail ? (
                  <img src={p.thumbnail} alt={p.name} className="h-8 w-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded bg-gray-100 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-900">{p.name}</p>
                  <p className={`text-[11px] font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.stock === 0 ? 'Out of Stock' : `${p.stock} left`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Insights Section ──────────────────────────────────────────────────────────

function InsightsSection() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    fetch(buildApiUrl(API_PATHS.analytics.dashboard), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.totals) setStats(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    )
  }

  const t = stats?.totals || {}

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Analytics</p>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">Insights Overview</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Revenue" value={`₹${(t.revenue || 0).toLocaleString('en-IN')}`} sub="All-time" color="emerald" />
        <StatCard label="Monthly Revenue" value={`₹${(t.monthRevenue || 0).toLocaleString('en-IN')}`} sub="This month" color="blue" />
        <StatCard label="Avg Order Value" value={`₹${(t.avgOrderValue || 0).toLocaleString('en-IN')}`} sub="Per order" color="violet" />
        <StatCard label="Conversion Rate" value={`${t.conversionRate || 0}%`} sub="Orders / Customers" color="amber" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-900">Monthly Revenue Trend</p>
          <BarChart data={stats?.monthlySales || []} valuePrefix="₹" color="#6366f1" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-900">Daily Revenue — Last 7 Days</p>
          <BarChart data={(stats?.dailySales || []).map((d) => ({ ...d, value: d.revenue }))} valuePrefix="₹" color="#10b981" />
        </div>
      </div>
    </div>
  )
}

// ─── Main AdminDashboard ───────────────────────────────────────────────────────

const SECTION_LABELS = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  'delivery-partners': 'Delivery Partners',
  products: 'Products',
  categories: 'Categories',
  subcategories: 'Sub-Categories',
  inventory: 'Inventory',
  orders: 'Orders',
  coupons: 'Coupons & Offers',
  payments: 'Payments',
  reports: 'Reports',
  insights: 'Insights',
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [counts, setCounts] = useState({})

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) { navigate('/login', { replace: true }); return }
    let parsedUser
    try { parsedUser = JSON.parse(storedUser) } catch (_) { navigate('/login', { replace: true }); return }
    if (parsedUser?.role !== 'admin') { navigate('/', { replace: true }); return }
    setAuthUser(parsedUser)
    setIsCheckingAuth(false)
  }, [navigate])

  useEffect(() => {
    if (!authUser) return
    const token = localStorage.getItem('authToken')
    fetch(buildApiUrl(API_PATHS.analytics.dashboard), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.totals) {
          setCounts({
            customers: data.totals.customers,
            deliveryPartners: data.totals.deliveryPartners,
            orders: data.totals.orders,
          })
        }
      })
      .catch(() => {})
  }, [authUser])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    navigate('/login', { replace: true })
  }, [navigate])

  if (isCheckingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Verifying access…</p>
        </div>
      </main>
    )
  }

  if (!authUser) return null

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen">
          <AdminSidebar
            authUser={authUser}
            counts={counts}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            onLogout={handleLogout}
          />
        </div>

        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Admin Panel</p>
              <h2 className="mt-0.5 text-lg font-semibold text-gray-900">{SECTION_LABELS[activeSection] || activeSection}</h2>
            </div>
            {/* Mobile nav hint */}
            <p className="text-xs text-gray-400 lg:hidden">Admin</p>
          </header>

          <div className="flex-1 px-6 py-6 lg:px-8">
            {activeSection === 'dashboard' && <OverviewSection authUser={authUser} />}
            {activeSection === 'customers' && <AdminUsersTable roleFilter="user" />}
            {activeSection === 'delivery-partners' && <AdminDeliveryPartners />}
            {activeSection === 'products' && <AdminProducts />}
            {activeSection === 'categories' && <AdminCategories />}
            {activeSection === 'subcategories' && <AdminSubCategories />}
            {activeSection === 'inventory' && <AdminInventory />}
            {activeSection === 'orders' && <AdminOrders />}
            {activeSection === 'coupons' && <AdminCoupons />}
            {activeSection === 'payments' && <AdminPayments />}
            {activeSection === 'reports' && <AdminReports />}
            {activeSection === 'settings' && <AdminSettings />}
            {activeSection === 'withdrawals' && <AdminWithdrawals />}
            {activeSection === 'insights' && <InsightsSection />}
          </div>
        </div>
      </div>
    </main>
  )
}

export default AdminDashboard
