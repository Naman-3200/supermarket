import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from './Footer'
import Navbar from './Navbar'

function LandingPage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (storedUser) {
      let parsedUser

      try {
        parsedUser = JSON.parse(storedUser)
      } catch (error) {
        localStorage.removeItem('authUser')
        localStorage.removeItem('authToken')
        return
      }

      if (parsedUser?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
        return
      }

      if (parsedUser?.role === 'delivery') {
        navigate('/delivery/dashboard', { replace: true })
        return
      }

      setAuthUser(parsedUser)
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Fresh groceries delivered fast
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
            Your neighborhood supermarket, now online.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            Shop fruits, vegetables, dairy, snacks, and daily essentials from Shubham Supermarket with easy
            ordering and same-day doorstep delivery.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700"
            >
              Start Shopping
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Browse Categories
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-100/60 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">Today&apos;s Highlights</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Farm Fresh</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">Vegetable Combo</p>
              <p className="mt-1 text-sm text-slate-600">Up to 25% off</p>
            </div>
            <div className="rounded-2xl bg-lime-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-lime-700">Daily Essentials</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">Milk, Bread, Eggs</p>
              <p className="mt-1 text-sm text-slate-600">Delivered in 30 mins</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Snacks</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">Tea-time Favorites</p>
              <p className="mt-1 text-sm text-slate-600">Buy 1 Get 1 offers</p>
            </div>
            <div className="rounded-2xl bg-cyan-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Member Deals</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">Extra 10% Savings</p>
              <p className="mt-1 text-sm text-slate-600">On first online order</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

export default LandingPage