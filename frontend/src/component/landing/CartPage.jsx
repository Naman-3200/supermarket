import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash, Plus, Minus, ArrowRight } from '@phosphor-icons/react'
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

function CartPage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [cartItems, setCartItems] = useState([])
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
    setCartItems(readLocalArray('supermarketCart'))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  const syncCart = (nextItems, message) => {
    setCartItems(nextItems)
    writeLocalArray('supermarketCart', nextItems)
    setNotice(message)
  }

  const updateQuantity = (productId, delta) => {
    const nextItems = cartItems
      .map((item) => {
        if (item._id !== productId) {
          return item
        }

        const nextQuantity = Number(item.quantity || 1) + delta
        return {
          ...item,
          quantity: Math.max(1, nextQuantity),
        }
      })
      .filter(Boolean)

    syncCart(nextItems, 'Cart updated.')
  }

  const removeItem = (productId) => {
    const nextItems = cartItems.filter((item) => item._id !== productId)
    syncCart(nextItems, 'Item removed from cart.')
  }

  const clearCart = () => {
    syncCart([], 'Cart cleared.')
  }

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 1), 0),
    [cartItems],
  )

  const itemCount = useMemo(
    () => cartItems.reduce((total, item) => total + Number(item.quantity || 1), 0),
    [cartItems],
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Shopping</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Cart</h1>
            <p className="mt-2 text-sm text-slate-600">Review items before placing an order.</p>
          </div>
          {cartItems.length > 0 ? (
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Clear Cart
            </button>
          ) : null}
        </div>

        {notice ? <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div> : null}

        {cartItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Your cart is empty</h2>
            <p className="mt-2 text-sm text-slate-600">Browse products and add items you want to buy.</p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Continue Shopping
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {cartItems.map((item) => (
                <article key={item._id} className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
                  <div className="grid gap-4 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                    <Link to={`/products/${item._id}`} className="block h-28 w-full overflow-hidden rounded-2xl bg-emerald-50">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.name} className={`h-full w-full object-cover ${item.isActive ? '' : 'opacity-45'}`} />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-slate-500">No image</div>
                      )}
                    </Link>

                    <div>
                      <Link to={`/products/${item._id}`}>
                        <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">₹{Number(item.price || 0).toFixed(2)} each</p>
                      <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.isActive ? 'Available' : 'Temporary not available'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item._id, -1)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-emerald-700"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          <Minus size={14} weight="bold" />
                        </button>
                        <span className="min-w-10 px-3 text-center text-sm font-semibold text-slate-900">{item.quantity || 1}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item._id, 1)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-emerald-700"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <Plus size={14} weight="bold" />
                        </button>
                      </div>
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
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Order Overview</h2>

              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Items</span>
                  <span className="font-semibold">{itemCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                onClick={() => {
                  if (!authUser) {
                    navigate('/login')
                  } else {
                    navigate('/checkout')
                  }
                }}
              >
                Proceed to Checkout
              </button>

              <Link
                to="/products"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                Continue Shopping
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

export default CartPage
