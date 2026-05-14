import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'
import Footer from './Footer'
import Navbar from './Navbar'

function CategoriesPage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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
    const fetchCategories = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(buildApiUrl(API_PATHS.categories.list))
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load categories')
        }

        setCategories(Array.isArray(data.categories) ? data.categories : [])
      } catch (err) {
        setError(err.message || 'Unable to load categories')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Explore Store</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">All Categories</h1>
          <p className="mt-2 text-sm text-slate-600">Browse every category available in Shubham Supermarket.</p>
        </div>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No categories found.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link key={category._id} to={`/categories/${category._id}`} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="h-48 w-full bg-emerald-50">
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-slate-500">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-bold text-slate-900">{category.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">{category.description || 'No description available.'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

export default CategoriesPage
