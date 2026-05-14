import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserCircle, MapPin, Wallet, Plus, Trash, PencilSimple, CheckCircle, Key, Warning } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function Section({ title, children }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  )
}

function ProfilePage() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState({ username: '', email: '', phone: '' })
  const [profileMsg, setProfileMsg] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const [addresses, setAddresses] = useState([])
  const [editingAddr, setEditingAddr] = useState(null)
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [addrForm, setAddrForm] = useState({ label: 'home', fullName: '', phone: '', addressLine: '', city: '', state: '', pincode: '', isDefault: false })
  const [addrMsg, setAddrMsg] = useState('')
  const [addrSaving, setAddrSaving] = useState(false)

  const [wallet, setWallet] = useState({ balance: 0, transactions: [] })
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpMsg, setTopUpMsg] = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) { navigate('/login', { replace: true }); return }
    try {
      const parsed = JSON.parse(storedUser)
      if (parsed?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
      if (parsed?.role === 'delivery') { navigate('/delivery/dashboard', { replace: true }); return }
      setAuthUser(parsed)
      setProfile({ username: parsed.username || '', email: parsed.email || '', phone: parsed.phone || '' })
    } catch { navigate('/login', { replace: true }) }
  }, [navigate])

  const token = () => localStorage.getItem('authToken')

  const fetchAddresses = () => {
    fetch(buildApiUrl(API_PATHS.auth.addresses), { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json()).then((d) => setAddresses(d.addresses || [])).catch(() => {})
  }

  const fetchWallet = () => {
    fetch(buildApiUrl(API_PATHS.auth.wallet), { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json()).then((d) => setWallet({ balance: d.balance || 0, transactions: d.transactions || [] })).catch(() => {})
  }

  useEffect(() => {
    if (authUser) { fetchAddresses(); fetchWallet() }
  }, [authUser])

  const flash = (setter, msg) => { setter(msg); setTimeout(() => setter(''), 3000) }

  const saveProfile = async () => {
    setProfileSaving(true)
    const res = await fetch(buildApiUrl(API_PATHS.auth.profile), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(profile),
    })
    const data = await res.json()
    if (res.ok) {
      localStorage.setItem('authUser', JSON.stringify(data.user))
      setAuthUser(data.user)
      flash(setProfileMsg, '✓ Profile updated')
    } else { flash(setProfileMsg, data.message || 'Failed to update') }
    setProfileSaving(false)
  }

  const savePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) { flash(setPwMsg, 'Passwords do not match'); return }
    setPwSaving(true)
    const res = await fetch(buildApiUrl(API_PATHS.auth.changePassword), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    })
    const data = await res.json()
    if (res.ok) { setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); flash(setPwMsg, '✓ Password changed') }
    else { flash(setPwMsg, data.message || 'Failed') }
    setPwSaving(false)
  }

  const saveAddress = async () => {
    setAddrSaving(true)
    const url = editingAddr
      ? buildApiUrl(API_PATHS.auth.addressById.replace(':addressId', editingAddr._id))
      : buildApiUrl(API_PATHS.auth.addresses)
    const method = editingAddr ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(addrForm),
    })
    const data = await res.json()
    if (res.ok) {
      setAddresses(data.addresses || [])
      setShowAddrForm(false)
      setEditingAddr(null)
      setAddrForm({ label: 'home', fullName: '', phone: '', addressLine: '', city: '', state: '', pincode: '', isDefault: false })
      flash(setAddrMsg, `✓ Address ${editingAddr ? 'updated' : 'added'}`)
    } else { flash(setAddrMsg, data.message || 'Failed') }
    setAddrSaving(false)
  }

  const deleteAddress = async (id) => {
    const res = await fetch(buildApiUrl(API_PATHS.auth.addressById.replace(':addressId', id)), {
      method: 'DELETE', headers: { Authorization: `Bearer ${token()}` },
    })
    const data = await res.json()
    if (res.ok) setAddresses(data.addresses || [])
  }

  const topUp = async () => {
    const amount = Number(topUpAmount)
    if (!amount || amount < 10) { flash(setTopUpMsg, 'Minimum top-up is ₹10'); return }
    setTopUpLoading(true)
    const res = await fetch(buildApiUrl(API_PATHS.auth.walletAdd), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ amount }),
    })
    const data = await res.json()
    if (res.ok) { setWallet((p) => ({ ...p, balance: data.balance })); setTopUpAmount(''); fetchWallet(); flash(setTopUpMsg, `✓ ₹${amount} added to wallet`) }
    else { flash(setTopUpMsg, data.message || 'Failed') }
    setTopUpLoading(false)
  }

  const deleteAccount = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    const res = await fetch(buildApiUrl(API_PATHS.auth.deleteAccount), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ password: deleteConfirm }),
    })
    if (res.ok) {
      localStorage.removeItem('authUser')
      localStorage.removeItem('authToken')
      navigate('/', { replace: true })
    } else {
      const d = await res.json()
      alert(d.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authUser')
    localStorage.removeItem('authToken')
    setAuthUser(null)
    navigate('/login', { replace: true })
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100'

  const TABS = [
    { key: 'profile', label: 'Profile', icon: <UserCircle size={17} weight="bold" /> },
    { key: 'addresses', label: 'Addresses', icon: <MapPin size={17} weight="bold" /> },
    { key: 'wallet', label: 'Wallet', icon: <Wallet size={17} weight="bold" /> },
    { key: 'security', label: 'Security', icon: <Key size={17} weight="bold" /> },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Avatar header */}
        <div className="mb-6 flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">
            {authUser?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{authUser?.username}</p>
            <p className="text-sm text-slate-500">{authUser?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map(({ key, label, icon }) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${tab === key ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'}`}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <Section title="Personal Information">
            <div className="grid gap-4">
              {[['Name', 'username', 'text', 'Your name'], ['Email', 'email', 'email', 'email@example.com'], ['Phone', 'phone', 'tel', '9876543210']].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
                  <input type={type} value={profile[key]} onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))} placeholder={ph} className={inputCls} />
                </div>
              ))}
            </div>
            {profileMsg && <p className={`mt-3 text-sm font-semibold ${profileMsg.startsWith('✓') ? 'text-emerald-700' : 'text-rose-600'}`}>{profileMsg}</p>}
            <button type="button" onClick={saveProfile} disabled={profileSaving}
              className="mt-5 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {profileSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </Section>
        )}

        {/* Addresses tab */}
        {tab === 'addresses' && (
          <Section title="Saved Addresses">
            {addrMsg && <p className={`mb-3 text-sm font-semibold ${addrMsg.startsWith('✓') ? 'text-emerald-700' : 'text-rose-600'}`}>{addrMsg}</p>}
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{addr.fullName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${addr.label === 'home' ? 'bg-blue-100 text-blue-700' : addr.label === 'work' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{addr.label}</span>
                        {addr.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Default</span>}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{addr.addressLine}, {addr.city}, {addr.state} – {addr.pincode}</p>
                      <p className="text-xs text-slate-500">📞 {addr.phone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditingAddr(addr); setAddrForm({ label: addr.label, fullName: addr.fullName, phone: addr.phone, addressLine: addr.addressLine, city: addr.city, state: addr.state, pincode: addr.pincode, isDefault: addr.isDefault }); setShowAddrForm(true) }}
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800"><PencilSimple size={16} weight="bold" /></button>
                      <button type="button" onClick={() => deleteAddress(addr._id)}
                        className="rounded-full p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash size={16} weight="bold" /></button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => { setEditingAddr(null); setAddrForm({ label: 'home', fullName: '', phone: '', addressLine: '', city: '', state: '', pincode: '', isDefault: false }); setShowAddrForm(true) }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700">
                <Plus size={16} weight="bold" /> Add New Address
              </button>
            </div>

            {showAddrForm && (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="mb-4 text-base font-bold text-slate-900">{editingAddr ? 'Edit Address' : 'Add Address'}</p>
                <div className="mb-3">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Label</label>
                  <div className="flex gap-2">
                    {['home', 'work', 'other'].map((l) => (
                      <button key={l} type="button" onClick={() => setAddrForm((p) => ({ ...p, label: l }))}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${addrForm.label === l ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3">
                  {[['fullName', 'Full Name', 'text'], ['phone', 'Phone', 'tel'], ['addressLine', 'Address', 'text'], ['city', 'City', 'text'], ['state', 'State', 'text'], ['pincode', 'Pincode', 'text']].map(([key, label, type]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
                      <input type={type} value={addrForm[key]} onChange={(e) => setAddrForm((p) => ({ ...p, [key]: e.target.value }))} className={inputCls} />
                    </div>
                  ))}
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm((p) => ({ ...p, isDefault: e.target.checked }))} className="h-4 w-4 rounded text-emerald-600" />
                    Set as default
                  </label>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={saveAddress} disabled={addrSaving}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                    {addrSaving ? 'Saving…' : 'Save Address'}
                  </button>
                  <button type="button" onClick={() => { setShowAddrForm(false); setEditingAddr(null) }}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Wallet tab */}
        {tab === 'wallet' && (
          <Section title="My Wallet">
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
              <p className="text-sm font-semibold text-emerald-100">Available Balance</p>
              <p className="mt-1 text-4xl font-black">₹{wallet.balance.toFixed(2)}</p>
            </div>
            <div className="mb-5">
              <p className="mb-3 text-sm font-bold text-slate-800">Top Up Wallet</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {[100, 200, 500, 1000].map((amt) => (
                  <button key={amt} type="button" onClick={() => setTopUpAmount(String(amt))}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${topUpAmount === String(amt) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-200'}`}>
                    ₹{amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} placeholder="Enter amount" min={10} max={50000} className={`${inputCls} flex-1`} />
                <button type="button" onClick={topUp} disabled={topUpLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                  {topUpLoading ? 'Adding…' : 'Add Money'}
                </button>
              </div>
              {topUpMsg && <p className={`mt-2 text-sm font-semibold ${topUpMsg.startsWith('✓') ? 'text-emerald-700' : 'text-rose-600'}`}>{topUpMsg}</p>}
            </div>
            {wallet.transactions.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-bold text-slate-800">Transaction History</p>
                <div className="space-y-2">
                  {wallet.transactions.map((t, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{t.description || (t.type === 'credit' ? 'Money Added' : 'Money Spent')}</p>
                        <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <span className={`text-sm font-bold ${t.type === 'credit' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {t.type === 'credit' ? '+' : '–'}₹{t.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Security tab */}
        {tab === 'security' && (
          <div className="space-y-5">
            <Section title="Change Password">
              <div className="grid gap-4">
                {[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']].map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
                    <input type="password" value={passwords[key]} onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))} className={inputCls} />
                  </div>
                ))}
              </div>
              {pwMsg && <p className={`mt-3 text-sm font-semibold ${pwMsg.startsWith('✓') ? 'text-emerald-700' : 'text-rose-600'}`}>{pwMsg}</p>}
              <button type="button" onClick={savePassword} disabled={pwSaving}
                className="mt-5 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </Section>

            <Section title="Delete Account">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 mb-4">
                <div className="flex gap-2 text-rose-700">
                  <Warning size={18} weight="bold" className="shrink-0 mt-0.5" />
                  <p className="text-sm">This action is <strong>permanent</strong> and cannot be undone. All your data, orders, and wallet balance will be deleted.</p>
                </div>
              </div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">Enter your password to confirm deletion</label>
              <input type="password" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Your current password" className={inputCls} />
              <button type="button" onClick={deleteAccount} disabled={!deleteConfirm || deleting}
                className="mt-4 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Delete My Account'}
              </button>
            </Section>
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

export default ProfilePage
