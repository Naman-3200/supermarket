import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from '@phosphor-icons/react'
import AdminSidebar from './AdminSidebar'
import AdminUsersTable from './AdminUsersTable'
import AdminCategories from './AdminCategories'
import AdminSubCategories from './AdminSubCategories'
import AdminProducts from './AdminProducts'
import AdminOrders from './AdminOrders'
import AdminDeliveryPartners from './AdminDeliveryPartners'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function AdminDashboard() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')
  const [users, setUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [ordersCount, setOrdersCount] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')

    if (!storedUser) {
      navigate('/login', { replace: true })
      return
    }

    let parsedUser

    try {
      parsedUser = JSON.parse(storedUser)
    } catch (error) {
      navigate('/login', { replace: true })
      return
    }

    if (parsedUser?.role !== 'admin') {
      navigate('/', { replace: true })
      return
    }

    setAuthUser(parsedUser)
    setIsCheckingAuth(false)
  }, [navigate])

  useEffect(() => {
    const fetchData = async () => {
      if (!authUser) return

      const token = localStorage.getItem('authToken')
      if (!token) {
        setUsersError('Missing token. Please login again.')
        return
      }

      setIsLoadingUsers(true)
      setUsersError('')

      try {
        const [usersRes, ordersRes] = await Promise.all([
          fetch(buildApiUrl(API_PATHS.auth.users), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(buildApiUrl(API_PATHS.orders.all), { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const usersData = await usersRes.json()
        if (usersRes.ok) {
          setUsers(Array.isArray(usersData.users) ? usersData.users : [])
        } else {
          setUsersError(usersData.message || 'Unable to load users')
        }

        const ordersData = await ordersRes.json()
        if (ordersRes.ok) {
          setOrdersCount(Array.isArray(ordersData.orders) ? ordersData.orders.length : 0)
        }
      } catch (error) {
        setUsersError(error.message || 'Unable to load data')
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchData()
  }, [authUser])

  const filteredUsers = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()
    if (!normalized) return users
    return users.filter((user) =>
      [user.username, user.email, user.phone, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    )
  }, [searchQuery, users])

  const totalUsers = users.length
  const adminUsers = users.filter((u) => u.role === 'admin').length
  const regularUsers = users.filter((u) => u.role === 'user').length
  const deliveryPartnersCount = users.filter((u) => u.role === 'delivery').length
  const usersCreatedThisMonth = users.filter((u) => {
    if (!u.createdAt) return false
    const d = new Date(u.createdAt)
    if (Number.isNaN(d.getTime())) return false
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  if (isCheckingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-700">Loading dashboard</p>
          <p className="mt-3 text-lg font-semibold">Checking admin access...</p>
        </div>
      </main>
    )
  }

  if (!authUser) return null

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[280px_1fr]">
        <div className="lg:sticky lg:top-0 lg:h-screen">
          <AdminSidebar
            authUser={authUser}
            usersCount={totalUsers}
            ordersCount={ordersCount}
            deliveryPartnersCount={deliveryPartnersCount}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            onLogout={handleLogout}
          />
        </div>

        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {activeSection === 'overview' && (
            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Admin Dashboard</p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                    Welcome back, {authUser.username}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
                    Professional control panel powered by real account data only.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  <ShieldCheck size={18} weight="bold" />
                  Admin Verified
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Total Users</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{totalUsers}</p>
                </article>
                <article className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Delivery Partners</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{deliveryPartnersCount}</p>
                </article>
                <article className="rounded-2xl border border-lime-100 bg-gradient-to-br from-lime-50 to-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-700">Total Orders</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{ordersCount ?? '—'}</p>
                </article>
                <article className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Regular Users</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{regularUsers}</p>
                </article>
              </div>
            </section>
          )}

          {activeSection === 'orders' && <AdminOrders />}

          {activeSection === 'delivery-partners' && <AdminDeliveryPartners />}

          {activeSection === 'users' && (
            <AdminUsersTable
              users={filteredUsers}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              isLoading={isLoadingUsers}
              error={usersError}
            />
          )}

          {activeSection === 'categories' && <AdminCategories />}

          {activeSection === 'subcategories' && <AdminSubCategories />}

          {activeSection === 'products' && <AdminProducts />}

          {activeSection === 'insights' && (
            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/50">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Insights</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">User Analytics</h2>
              <p className="mt-2 text-sm text-slate-600">Based on real user records from your backend.</p>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Accounts</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{totalUsers}</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin Accounts</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{adminUsers}</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">User Accounts</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{regularUsers}</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Created This Month</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{usersCreatedThisMonth}</p>
                </article>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

export default AdminDashboard
