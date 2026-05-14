import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MagnifyingGlass, ShoppingCart, X } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const MAX_RECENT = 8

function readLocalArray(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
function writeLocalArray(key, value) { localStorage.setItem(key, JSON.stringify(value)) }

function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [authUser, setAuthUser] = useState(null)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
        if (parsed?.role === 'delivery') { navigate('/delivery/dashboard', { replace: true }); return }
        setAuthUser(parsed)
      } catch { localStorage.removeItem('authUser') }
    }
    setRecentSearches(readLocalArray('supermarketRecentSearches'))
  }, [navigate])

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(buildApiUrl(`${API_PATHS.products.list}?search=${encodeURIComponent(q)}&limit=24`))
      const data = await res.json()
      setResults(data.products || [])
    } catch { setResults([]) }
    setLoading(false)
  }, [])

  // Debounced suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setSuggestions([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(buildApiUrl(`${API_PATHS.products.list}?search=${encodeURIComponent(query)}&limit=5`))
        const data = await res.json()
        setSuggestions((data.products || []).map((p) => p.name).slice(0, 5))
      } catch { setSuggestions([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Run search from URL param
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) { setQuery(q); doSearch(q) }
  }, [searchParams, doSearch])

  const submitSearch = (q = query) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setSearchParams({ q: trimmed })
    setSuggestions([])

    // Save to recent
    const recents = [trimmed, ...readLocalArray('supermarketRecentSearches').filter((r) => r !== trimmed)].slice(0, MAX_RECENT)
    setRecentSearches(recents)
    writeLocalArray('supermarketRecentSearches', recents)
  }

  const clearRecent = (term) => {
    const updated = recentSearches.filter((r) => r !== term)
    setRecentSearches(updated)
    writeLocalArray('supermarketRecentSearches', updated)
  }

  const addToCart = (product) => {
    if (!product.isActive) { setNotice('Product unavailable'); return }
    const cart = readLocalArray('supermarketCart')
    const idx = cart.findIndex((i) => i._id === product._id)
    if (idx >= 0) cart[idx].quantity += 1
    else cart.push({ ...product, quantity: 1 })
    writeLocalArray('supermarketCart', cart)
    window.dispatchEvent(new Event('cartUpdated'))
    setNotice('Added to cart!')
    setTimeout(() => setNotice(''), 2000)
  }

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  const q = searchParams.get('q') || ''

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Search bar */}
        <div className="mb-8">
          <div className="relative">
            <form onSubmit={(e) => { e.preventDefault(); submitSearch() }}>
              <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                <MagnifyingGlass size={20} weight="bold" className="ml-4 shrink-0 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for products, brands, categories…"
                  autoFocus
                  className="flex-1 bg-transparent px-4 py-4 text-base text-slate-800 outline-none placeholder:text-slate-400"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setResults([]); setSuggestions([]) }}
                    className="mr-2 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <X size={16} weight="bold" />
                  </button>
                )}
                <button type="submit" className="mr-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
                  Search
                </button>
              </div>
            </form>

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && query && !q && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => { setQuery(s); submitSearch(s) }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">
                    <MagnifyingGlass size={14} className="shrink-0 text-slate-400" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

        {/* No query state */}
        {!q && (
          <div>
            {recentSearches.length > 0 && (
              <div className="mb-8">
                <p className="mb-3 text-sm font-bold text-slate-700">Recent Searches</p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <div key={term} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white pl-3 pr-2 py-1.5">
                      <button type="button" onClick={() => { setQuery(term); submitSearch(term) }}
                        className="text-sm text-slate-700 hover:text-emerald-700">{term}</button>
                      <button type="button" onClick={() => clearRecent(term)}
                        className="ml-1 rounded-full p-0.5 text-slate-400 hover:text-rose-500">
                        <X size={12} weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-center py-10">
              <MagnifyingGlass size={56} weight="thin" className="mx-auto text-slate-200" />
              <p className="mt-4 text-slate-500">Search for any product, category or brand</p>
            </div>
          </div>
        )}

        {/* Results */}
        {q && (
          <div>
            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-100 bg-white p-3 animate-pulse">
                    <div className="aspect-square rounded-xl bg-slate-100" />
                    <div className="mt-3 h-4 rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <MagnifyingGlass size={52} weight="thin" className="mx-auto text-slate-300" />
                <h2 className="mt-5 text-xl font-bold text-slate-900">No results for "{q}"</h2>
                <p className="mt-2 text-sm text-slate-500">Try a different keyword or browse our categories.</p>
                <Link to="/categories" className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  Browse Categories
                </Link>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-600"><strong>{results.length}</strong> result{results.length !== 1 ? 's' : ''} for "{q}"</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {results.map((product) => {
                    const discounted = product.discount ? product.price - (product.price * product.discount) / 100 : null
                    return (
                      <div key={product._id} className="group rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md hover:border-emerald-200">
                        <Link to={`/products/${product._id}`}>
                          <div className="relative aspect-square overflow-hidden rounded-xl bg-emerald-50">
                            {product.thumbnail
                              ? <img src={product.thumbnail} alt={product.name} className={`h-full w-full object-cover transition group-hover:scale-105 ${!product.isActive ? 'opacity-50' : ''}`} />
                              : <div className="grid h-full place-items-center text-slate-300 text-sm">No image</div>}
                            {product.discount > 0 && (
                              <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{product.discount}% OFF</span>
                            )}
                          </div>
                        </Link>
                        <div className="mt-3 px-1">
                          <Link to={`/products/${product._id}`}>
                            <p className="truncate text-sm font-semibold text-slate-800 hover:text-emerald-700">{product.name}</p>
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-400">{product.unit || ''}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              {discounted ? (
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold">₹{discounted.toFixed(0)}</span>
                                  <span className="text-[11px] text-slate-400 line-through">₹{product.price}</span>
                                </div>
                              ) : (
                                <span className="text-sm font-bold">₹{product.price}</span>
                              )}
                            </div>
                            <button type="button" onClick={() => addToCart(product)} disabled={!product.isActive}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                              <ShoppingCart size={14} weight="bold" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

export default SearchPage
