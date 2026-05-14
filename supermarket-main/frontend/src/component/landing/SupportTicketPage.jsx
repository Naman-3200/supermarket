import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const STATUS_COLORS = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved:    'bg-emerald-100 text-emerald-700',
  closed:      'bg-slate-100 text-slate-600',
}

function SupportTicketPage() {
  const navigate = useNavigate()
  const { ticketId } = useParams()
  const [authUser, setAuthUser] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) { navigate('/login', { replace: true }); return }
    try {
      const parsed = JSON.parse(storedUser)
      setAuthUser(parsed)
    } catch { navigate('/login', { replace: true }) }
  }, [navigate])

  const token = () => localStorage.getItem('authToken')

  const fetchTicket = () => {
    setLoading(true)
    fetch(buildApiUrl(API_PATHS.support.getById.replace(':id', ticketId)), { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((d) => { if (d.ticket) setTicket(d.ticket); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { if (authUser) fetchTicket() }, [authUser, ticketId])

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
    navigate('/login', { replace: true })
  }

  const sendReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    const res = await fetch(buildApiUrl(API_PATHS.support.reply.replace(':id', ticketId)), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ message: reply }),
    })
    if (res.ok) { setReply(''); fetchTicket() }
    setSending(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Link to="/support" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700">
          <ArrowLeft size={16} weight="bold" /> Back to Support
        </Link>

        {loading ? (
          <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>
        ) : !ticket ? (
          <p className="text-center text-slate-600">Ticket not found.</p>
        ) : (
          <>
            <div className="mb-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-400">{ticket.ticketNumber}</p>
                  <h1 className="mt-1 text-xl font-black text-slate-900">{ticket.subject}</h1>
                  <p className="mt-1 text-xs text-slate-500 capitalize">{ticket.category.replace('_', ' ')} · {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${STATUS_COLORS[ticket.status] || 'bg-slate-100 text-slate-600'}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">{ticket.message}</div>
              {ticket.orderId && (
                <div className="mt-3 text-xs text-slate-500">
                  Linked order: <Link to={`/orders/${ticket.orderId._id || ticket.orderId}`} className="text-emerald-700 hover:underline">{ticket.orderId.orderNumber || ticket.orderId}</Link>
                </div>
              )}
            </div>

            {/* Conversation */}
            {ticket.replies.length > 0 && (
              <div className="mb-5 space-y-3">
                <p className="text-sm font-bold text-slate-700">Conversation</p>
                {ticket.replies.map((r, i) => (
                  <div key={i} className={`flex gap-3 ${r.sender === 'admin' ? '' : 'flex-row-reverse'}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${r.sender === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {r.sender === 'admin' ? 'S' : authUser?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${r.sender === 'admin' ? 'bg-white border border-slate-200' : 'bg-emerald-600 text-white'}`}>
                      <p className="whitespace-pre-wrap">{r.message}</p>
                      <p className={`mt-1 text-[10px] ${r.sender === 'admin' ? 'text-slate-400' : 'text-emerald-200'}`}>
                        {r.senderName} · {new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply box */}
            {!['closed', 'resolved'].includes(ticket.status) && (
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-bold text-slate-800">Add a Reply</p>
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your message…" rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none" />
                <button type="button" onClick={sendReply} disabled={!reply.trim() || sending}
                  className="mt-3 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </main>
  )
}

export default SupportTicketPage
