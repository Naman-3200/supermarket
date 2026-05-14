import { useState } from 'react'
import {
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  PhoneIcon,
  TruckIcon,
  UserIcon,
} from '@phosphor-icons/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDeliverySignup = searchParams.get('role') === 'delivery'
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    role: isDeliverySignup ? 'delivery' : 'user',
    vehicleNumber: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Password and confirm password do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      }

      if (formData.role === 'delivery') {
        payload.vehicleNumber = formData.vehicleNumber.trim()
      }

      const response = await fetch(buildApiUrl(API_PATHS.auth.signup), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Unable to sign up')
        return
      }

      localStorage.setItem('authUser', JSON.stringify(data.user))
      localStorage.setItem('authToken', data.token)
      navigate(data.user?.role === 'delivery' ? '/delivery/dashboard' : '/')
    } catch (requestError) {
      setError('Server error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      <div className="w-full lg:w-1/2 flex justify-center items-center">
        <div className="w-full max-w-xl px-6 py-10 lg:py-6">
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <div className="h-32 w-32 rounded-lg text-white grid place-items-center text-lg font-bold">
                <img src="/assets/logo.png" alt="" />
              </div>
              <div className="flex flex-col leading-[0.9]">
                <span className="font-semibold text-[20px]">Sign in to your go to grocery store, online.</span>
                <span className="font-semibold text-[20px] -mt-[2px]"></span>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">{error}</div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-base font-semibold tracking-tight text-gray-800" htmlFor="username">
                Username <span className="text-orange-600">*</span>
              </label>

              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <UserIcon size={22} />
                </span>

                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Ex. John Doe"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="text-base font-semibold tracking-tight text-gray-800" htmlFor="email">
                Email <span className="text-orange-600">*</span>
              </label>

              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <EnvelopeIcon size={22} />
                </span>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Ex. user@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="text-base font-semibold tracking-tight text-gray-800" htmlFor="phone">
                Phone <span className="text-orange-600">*</span>
              </label>

              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <PhoneIcon size={22} />
                </span>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Ex. 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="text-base font-semibold tracking-tight text-gray-800" htmlFor="role">
                Create Account As <span className="text-orange-600">*</span>
              </label>

              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="user">Customer</option>
                <option value="delivery">Delivery Man</option>
              </select>
            </div>

            {formData.role === 'delivery' ? (
              <div>
                <label className="text-base font-semibold tracking-tight text-gray-800" htmlFor="vehicleNumber">
                  Vehicle Number <span className="text-orange-600">*</span>
                </label>

                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <TruckIcon size={22} />
                  </span>

                  <input
                    id="vehicleNumber"
                    name="vehicleNumber"
                    type="text"
                    placeholder="Ex. UP32AB1234"
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                    required={formData.role === 'delivery'}
                    className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label className="text-base font-semibold tracking-tight text-gray-800" htmlFor="password">
                Password <span className="text-orange-600">*</span>
              </label>

              <div className="relative mt-1">
                <KeyIcon
                  size={22}
                  weight="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-md border border-gray-300 pl-10 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlashIcon size={22} weight="regular" /> : <EyeIcon size={22} weight="regular" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-base font-semibold tracking-tight text-gray-800" htmlFor="confirmPassword">
                Confirm Password <span className="text-orange-600">*</span>
              </label>

              <div className="relative mt-1">
                <KeyIcon
                  size={22}
                  weight="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-md border border-gray-300 pl-10 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon size={22} weight="regular" />
                  ) : (
                    <EyeIcon size={22} weight="regular" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#714b23] hover:bg-orange-600 text-white font-medium py-2.5 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating account...' : 'Sign up'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-[#6cc300] cursor-pointer hover:underline"
              >
                Log in
              </button>
            </p>
          </form>
        </div>
      </div>

     
   <div className="hidden lg:flex w-1/2 items-center justify-center bg-orange-50">
        <div className="w-[95%] h-[95%] rounded-2xl overflow-hidden shadow-lg relative">
                <div className="absolute inset-0 bg-black/60" />
          {/* Background Image */}
          <img
            src="https://www.brandbucket.com/ideas_cache_resize_1600/name-ideas/grocery-business-names.jpeg"
            alt="Online grocery illustration"
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />

        <div className="relative z-10 h-full flex items-end p-6 sm:p-8 md:p-10">
            <div className="space-y-2 max-w-sm bg-white/50 p-2 rounded-xl">
              <h2 className="text-black text-base sm:text-lg font-semibold">
               Your{" "}
                <span className="text-black">Go-To Online Store</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#714b23] font-semibold ">
                Experience structured video workflows with real-time feedback,
                version control, and faster delivery cycles.
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default SignupPage
