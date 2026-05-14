import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Headset, Plus, ArrowRight, Phone } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const TICKET_COLORS = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved:    'bg-emerald-100 text-emerald-700',
  closed:      'bg-slate-100 text-slate-600',
}

function SupportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefillOrderId = searchParams.get('orderId') || ''
  const prefillOrderNo = searchParams.get('orderNo') || ''

  const [authUser, setAuthUser] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(Boolean(prefillOrderId))
  const [form, setForm] = useState({
    subject: prefillOrderNo ? `Issue with order ${prefillOrderNo}` : '',
    message: '',
    category: prefillOrderId ? 'order_issue' : 'other',
    orderId: prefillOrderId,
    priority: 'medium',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) { navigate('/login', { replace: true }); return }
    try {
      const parsed = JSON.parse(storedUser)
      if (parsed?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
      if (parsed?.role === 'delivery') { navigate('/delivery/dashboard', { replace: true }); return }
      setAuthUser(parsed)
    } catch { navigate('/login', { replace: true }) }
  }, [navigate])

  const token = () => localStorage.getItem('authToken')

  const fetchTickets = () => {
    setLoading(true)
    fetch(buildApiUrl(API_PATHS.support.myTickets), { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((d) => { setTickets(d.tickets || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { if (authUser) fetchTickets() }, [authUser])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
    navigate('/login', { replace: true })
  }

  const submitTicket = async () => {
    if (!form.subject.trim() || !form.message.trim()) { setSubmitMsg('Please fill in all fields'); return }
    setSubmitting(true)
    const res = await fetch(buildApiUrl(API_PATHS.support.create), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setTickets((p) => [data.ticket, ...p])
      setShowForm(false)
      setForm({ subject: '', message: '', category: 'other', orderId: '', priority: 'medium' })
      setSubmitMsg('')
    } else { setSubmitMsg(data.message || 'Failed to create ticket') }
    setSubmitting(false)
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none'

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Headset size={32} weight="bold" className="text-emerald-600" />
            <div>
              <h1 className="text-2xl font-black text-slate-900">Customer Support</h1>
              <p className="text-sm text-slate-500">We're here to help you</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
            <Plus size={16} weight="bold" /> New Ticket
          </button>
        </div>

        {/* Quick contact */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <a href="tel:+919999999999" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Phone size={18} weight="bold" className="text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Call Support</p>
              <p className="text-xs text-slate-500">+91 99999 99999 · 9AM – 9PM</p>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Headset size={18} weight="bold" className="text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Average Response</p>
              <p className="text-xs text-slate-500">Usually within 2 hours</p>
            </div>
          </div>
        </div>

        {/* Create ticket form */}
        {showForm && (
          <div className="mb-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-900">New Support Ticket</h2>
            <div className="grid gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Category</label>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className={inputCls}>
                  {[['order_issue', 'Order Issue'], ['payment', 'Payment'], ['delivery', 'Delivery'], ['product', 'Product'], ['refund', 'Refund'], ['other', 'Other']].map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Subject</label>
                <input type="text" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Brief description of your issue" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Message</label>
                <textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} placeholder="Describe your issue in detail…" rows={4} className={inputCls} />
              </div>
              {prefillOrderId && (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Linked to order: <strong>{prefillOrderNo || prefillOrderId}</strong>
                </div>
              )}
            </div>
            {submitMsg && <p className="mt-3 text-sm text-rose-600">{submitMsg}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={submitTicket} disabled={submitting}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                {submitting ? 'Submitting…' : 'Submit Ticket'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setSubmitMsg('') }}
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tickets list */}
        <h2 className="mb-4 text-base font-bold text-slate-900">My Tickets</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Headset size={48} weight="thin" className="mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-bold text-slate-800">No support tickets yet</h3>
            <p className="mt-1 text-sm text-slate-500">Need help? Create a ticket above or call us directly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Link key={ticket._id} to={`/support/${ticket._id}`}
                className="block rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-slate-400">{ticket.ticketNumber}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TICKET_COLORS[ticket.status] || 'bg-slate-100 text-slate-600'}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-semibold text-slate-900">{ticket.subject}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {ticket.category.replace('_', ' ')} · {ticket.replies.length} repl{ticket.replies.length !== 1 ? 'ies' : 'y'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    <ArrowRight size={16} weight="bold" className="text-slate-400" />
                  </div>
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

export default SupportPage
