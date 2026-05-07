import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ShoppingCart, Truck, UserCircle } from '@phosphor-icons/react'
import AdminSidebar from './AdminSidebar'
import AdminUsersTable from './AdminUsersTable'
import AdminCategories from './AdminCategories'
import AdminSubCategories from './AdminSubCategories'
import AdminProducts from './AdminProducts'
import AdminOrders from './AdminOrders'
import AdminDeliveryPartners from './AdminDeliveryPartners'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function StatCard({ label, value, description, icon: Icon, iconBg, iconColor }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </article>
  )
}

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
    } catch (_err) {
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
      <main className="grid min-h-screen place-items-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Verifying access…</p>
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

  const sectionLabels = {
    overview: 'Overview',
    orders: 'Orders',
    'delivery-partners': 'Delivery Partners',
    users: 'Users',
    categories: 'Categories',
    subcategories: 'Sub-Categories',
    products: 'Products',
    insights: 'Insights',
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[260px_1fr]">
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

        <div className="flex flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Admin Dashboard</p>
              <h2 className="mt-0.5 text-lg font-semibold text-gray-900">{sectionLabels[activeSection]}</h2>
            </div>
          </header>

          <div className="flex-1 px-6 py-6 lg:px-8">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Welcome */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <UserCircle size={28} weight="fill" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Welcome back</p>
                      <h1 className="text-xl font-bold text-gray-900">{authUser.username}</h1>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Total Users"
                    value={totalUsers}
                    description="All registered accounts"
                    icon={Users}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                  />
                  <StatCard
                    label="Delivery Partners"
                    value={deliveryPartnersCount}
                    description="Active delivery staff"
                    icon={Truck}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                  />
                  <StatCard
                    label="Total Orders"
                    value={ordersCount ?? '—'}
                    description="All time orders"
                    icon={ShoppingCart}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                  />
                  <StatCard
                    label="Regular Users"
                    value={regularUsers}
                    description="Customer accounts"
                    icon={Users}
                    iconBg="bg-violet-50"
                    iconColor="text-violet-600"
                  />
                </div>
              </div>
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
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Analytics</p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-900">User Insights</h2>
                  <p className="mt-1 text-sm text-gray-500">Based on real user records from your backend.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Total Accounts"
                    value={totalUsers}
                    description="All roles combined"
                    icon={Users}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                  />
                  <StatCard
                    label="Admin Accounts"
                    value={adminUsers}
                    description="Administrator users"
                    icon={Users}
                    iconBg="bg-rose-50"
                    iconColor="text-rose-600"
                  />
                  <StatCard
                    label="User Accounts"
                    value={regularUsers}
                    description="Regular customers"
                    icon={Users}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                  />
                  <StatCard
                    label="This Month"
                    value={usersCreatedThisMonth}
                    description="New registrations"
                    icon={Users}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default AdminDashboard
