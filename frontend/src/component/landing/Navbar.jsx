import { Link } from 'react-router-dom'
import { ListChecks, ShoppingCart, UserCircle, Package } from '@phosphor-icons/react'

function readLocalArray(storageKey) {
  try {
    const rawValue = localStorage.getItem(storageKey)
    return rawValue ? JSON.parse(rawValue) : []
  } catch (error) {
    return []
  }
}

function Navbar({ isLoggedIn, authUser, onLogout }) {
  const cartCount = readLocalArray('supermarketCart').reduce((total, item) => total + Number(item.quantity || 1), 0)
  const waitlistCount = readLocalArray('supermarketWaitlist').length

  return (
    <header className="sticky top-0 z-20 border-b border-emerald-100/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-emerald-700">
          Shubham Supermarket
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-700 md:flex">
          <Link className="transition hover:text-emerald-700" to="/categories">
            Categories
          </Link>
          <Link className="transition hover:text-emerald-700" to="/products">
            All Products
          </Link>
          <Link className="relative inline-flex items-center gap-2 transition hover:text-emerald-700" to="/cart">
            <ShoppingCart size={18} weight="bold" />
            <span>Cart</span>
            {cartCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <Link className="relative inline-flex items-center gap-2 transition hover:text-emerald-700" to="/waitlist">
            <ListChecks size={18} weight="bold" />
            <span>Waitlist</span>
            {waitlistCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {waitlistCount}
              </span>
            ) : null}
          </Link>
        </nav>

        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <Link
              to="/orders"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 sm:flex"
            >
              <Package size={16} weight="bold" />
              My Orders
            </Link>
            <div className="flex items-center gap-3 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2">
              <UserCircle size={28} weight="fill" className="text-emerald-700" />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-800">{authUser?.username || 'Profile'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/signup?role=delivery"
              className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100"
            >
              Become Delivery Man
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar
