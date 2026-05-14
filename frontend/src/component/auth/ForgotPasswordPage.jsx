import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, EnvelopeSimple } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetUrl, setResetUrl] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setStatus('')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.auth.forgotPassword), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setStatus(data.message || 'Reset link sent')
      if (data.resetUrl) setResetUrl(data.resetUrl)
    } catch {
      setStatus('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-sm">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700">
          <ArrowLeft size={16} weight="bold" /> Back to Login
        </Link>

        <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <EnvelopeSimple size={28} weight="bold" className="text-emerald-700" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Forgot Password?</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your registered email address and we'll send you a reset link.</p>

          {status ? (
            <div className="mt-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                {status}
              </div>
              {resetUrl && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                  <p className="font-semibold mb-1">Development mode – Reset link:</p>
                  <Link to={new URL(resetUrl).pathname} className="break-all text-emerald-700 underline">{resetUrl}</Link>
                </div>
              )}
              <button type="button" onClick={() => { setStatus(''); setResetUrl(''); setEmail('') }}
                className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800 underline">
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6">
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <button type="submit" disabled={loading || !email.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Sending…</> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default ForgotPasswordPage
