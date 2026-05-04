import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ShoppingCart, Trash } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'

function readLocalArray(storageKey) {
  try {
    const rawValue = localStorage.getItem(storageKey)
    return rawValue ? JSON.parse(rawValue) : []
  } catch (error) {
    return []
  }
}

function writeLocalArray(storageKey, value) {
  localStorage.setItem(storageKey, JSON.stringify(value))
}

function WaitlistPage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [waitlistItems, setWaitlistItems] = useState([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')

    if (!storedUser) {
      return
    }

    try {
      const parsedUser = JSON.parse(storedUser)

      if (parsedUser?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
        return
      }

      if (parsedUser?.role === 'delivery') {
        navigate('/delivery/dashboard', { replace: true })
        return
      }

      setAuthUser(parsedUser)
    } catch (error) {
      localStorage.removeItem('authUser')
      localStorage.removeItem('authToken')
    }
  }, [navigate])

  useEffect(() => {
    setWaitlistItems(readLocalArray('supermarketWaitlist'))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  const syncWaitlist = (nextItems, message) => {
    setWaitlistItems(nextItems)
    writeLocalArray('supermarketWaitlist', nextItems)
    setNotice(message)
  }

  const removeItem = (productId) => {
    const nextItems = waitlistItems.filter((item) => item._id !== productId)
    syncWaitlist(nextItems, 'Item removed from waitlist.')
  }

  const clearWaitlist = () => {
    syncWaitlist([], 'Waitlist cleared.')
  }

  const moveToCart = (product) => {
    if (!product.isActive) {
      setNotice('This product is still temporary not available.')
      return
    }

    const cartItems = readLocalArray('supermarketCart')
    const existingIndex = cartItems.findIndex((item) => item._id === product._id)

    if (existingIndex >= 0) {
      cartItems[existingIndex].quantity += 1
    } else {
      cartItems.push({ ...product, quantity: 1 })
    }

    writeLocalArray('supermarketCart', cartItems)

    const nextItems = waitlistItems.filter((item) => item._id !== product._id)
    syncWaitlist(nextItems, 'Moved item to cart.')
  }

  const itemCount = useMemo(() => waitlistItems.length, [waitlistItems])

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Saved Items</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Waitlist</h1>
            <p className="mt-2 text-sm text-slate-600">Keep track of products that are currently unavailable.</p>
          </div>
          {waitlistItems.length > 0 ? (
            <button
              type="button"
              onClick={clearWaitlist}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Clear Waitlist
            </button>
          ) : null}
        </div>

        {notice ? <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div> : null}

        {waitlistItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">No items in waitlist</h2>
            <p className="mt-2 text-sm text-slate-600">Add inactive products here to come back later.</p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Browse Products
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {waitlistItems.map((item) => (
                <article key={item._id} className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
                  <div className="grid gap-4 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                    <Link to={`/products/${item._id}`} className="block h-28 w-full overflow-hidden rounded-2xl bg-emerald-50">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-slate-500">No image</div>
                      )}
                    </Link>

                    <div>
                      <Link to={`/products/${item._id}`}>
                        <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">₹{Number(item.price || 0).toFixed(2)}</p>
                      <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.isActive ? 'Available now' : 'Temporary not available'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <button
                        type="button"
                        onClick={() => moveToCart(item)}
                        disabled={!item.isActive}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <ShoppingCart size={14} weight="bold" />
                        Move to Cart
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item._id)}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        <Trash size={14} weight="bold" />
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="h-fit rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Summary</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Saved Products</h2>

              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Items</span>
                  <span className="font-semibold">{itemCount}</span>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-amber-800">
                  Items stay here until they become available or you remove them.
                </div>
              </div>

              <Link
                to="/products"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Browse Products
                <ArrowRight size={16} weight="bold" />
              </Link>
            </aside>
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

export default WaitlistPage
