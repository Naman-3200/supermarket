import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Heart, UserCircle, Package, MagnifyingGlass, List, X, Headset } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function readLocalArray(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}

function Navbar({ isLoggedIn, authUser, onLogout }) {
  const navigate = useNavigate()
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    const updateCounts = () => {
      setCartCount(readLocalArray('supermarketCart').reduce((t, i) => t + Number(i.quantity || 1), 0))
    }
    updateCounts()
    window.addEventListener('storage', updateCounts)
    window.addEventListener('cartUpdated', updateCounts)
    return () => {
      window.removeEventListener('storage', updateCounts)
      window.removeEventListener('cartUpdated', updateCounts)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) { setWishlistCount(0); return }
    const token = localStorage.getItem('authToken')
    if (!token) return
    fetch(buildApiUrl(API_PATHS.wishlist.count), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setWishlistCount(d.count || 0))
      .catch(() => {})

    const updateWishlist = () => {
      fetch(buildApiUrl(API_PATHS.wishlist.count), { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setWishlistCount(d.count || 0))
        .catch(() => {})
    }
    window.addEventListener('wishlistUpdated', updateWishlist)
    return () => window.removeEventListener('wishlistUpdated', updateWishlist)
  }, [isLoggedIn])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="shrink-0 text-lg font-extrabold tracking-tight text-emerald-700 sm:text-xl">
          Shubham Supermarket
        </Link>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="hidden flex-1 sm:flex">
          <div className="flex w-full max-w-lg items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
            <input
              ref={searchRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products…"
              className="flex-1 bg-transparent px-4 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button type="submit" className="px-4 py-2 text-emerald-600 hover:text-emerald-800">
              <MagnifyingGlass size={18} weight="bold" />
            </button>
          </div>
        </form>

        {/* Nav links (desktop) */}
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-700 lg:flex">
          <Link className="transition hover:text-emerald-700" to="/categories">Categories</Link>
          <Link className="transition hover:text-emerald-700" to="/products">Products</Link>
        </nav>

        {/* Icon group */}
        <div className="ml-auto flex items-center gap-2">
          {/* Mobile search */}
          <Link to="/search" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 sm:hidden">
            <MagnifyingGlass size={20} weight="bold" />
          </Link>

          {/* Cart */}
          <Link to="/cart" className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
            <ShoppingCart size={20} weight="bold" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {/* Wishlist (only when logged in) */}
          {isLoggedIn && (
            <Link to="/wishlist" className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-rose-50 hover:text-rose-600">
              <Heart size={20} weight="bold" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>
          )}

          {isLoggedIn ? (
            <>
              <Link to="/orders" className="hidden h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 sm:flex">
                <Package size={15} weight="bold" />
                Orders
              </Link>
              <Link to="/profile" className="hidden h-9 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:flex">
                <UserCircle size={18} weight="fill" />
                {authUser?.username?.split(' ')[0] || 'Profile'}
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="hidden rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600 sm:block"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-full border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:block">
                Login
              </Link>
              <Link to="/signup" className="hidden rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:block">
                Sign Up
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 sm:hidden"
          >
            {menuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 sm:hidden">
          <form onSubmit={handleSearch} className="mb-3">
            <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products…"
                className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
              />
              <button type="submit" className="px-4 py-2.5 text-emerald-600">
                <MagnifyingGlass size={18} weight="bold" />
              </button>
            </div>
          </form>
          <nav className="space-y-1 text-sm font-medium">
            {[
              { to: '/categories', label: 'Categories' },
              { to: '/products', label: 'All Products' },
              { to: '/cart', label: `Cart${cartCount > 0 ? ` (${cartCount})` : ''}` },
              ...(isLoggedIn ? [
                { to: '/wishlist', label: `Wishlist${wishlistCount > 0 ? ` (${wishlistCount})` : ''}` },
                { to: '/orders', label: 'My Orders' },
                { to: '/profile', label: 'Profile' },
                { to: '/support', label: 'Support' },
              ] : []),
            ].map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-2.5 text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700">
                {label}
              </Link>
            ))}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => { onLogout(); setMenuOpen(false) }}
                className="block w-full rounded-xl px-4 py-2.5 text-left text-rose-600 transition hover:bg-rose-50"
              >
                Logout
              </button>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 rounded-xl border border-emerald-200 py-2.5 text-center text-sm font-semibold text-emerald-700">Login</Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-center text-sm font-semibold text-white">Sign Up</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Navbar
