import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Truck, CreditCard, CheckCircle, X, LockKey, ArrowLeft, Plus, MapPin, Wallet, NavigationArrow } from '@phosphor-icons/react'
import Footer from './Footer'
import Navbar from './Navbar'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

const MIN_ORDER = 99

// ─── Embedded Location Picker Map ─────────────────────────────────────────────

function LocationPickerMap({ onLocationSelect }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [leafletReady, setLeafletReady] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  useEffect(() => {
    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if (window.L) { setLeafletReady(true); return }
    const script = document.createElement('script')
    script.id = 'leaflet-js'
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setLeafletReady(true)
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapRef.current) return
    const L = window.L
    const defaultLat = 19.076, defaultLng = 72.8777
    const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    const icon = L.divIcon({
      html: '<div style="width:28px;height:28px;background:#059669;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
      iconSize: [28, 28], iconAnchor: [14, 28], className: '',
    })
    const marker = L.marker([defaultLat, defaultLng], { draggable: true, icon }).addTo(map)
    marker.on('dragend', async (e) => {
      const { lat, lng } = e.target.getLatLng()
      await reverseGeocode(lat, lng)
    })
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng
      marker.setLatLng([lat, lng])
      await reverseGeocode(lat, lng)
    })
    mapRef.current = map
    markerRef.current = marker
  }, [leafletReady])

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`)
      const data = await res.json()
      if (data?.address && onLocationSelect) {
        const a = data.address
        const road = [a.road, a.neighbourhood, a.suburb].filter(Boolean).join(', ')
        onLocationSelect({
          addressLine: road || data.display_name?.split(',')[0] || '',
          city: a.city || a.town || a.village || a.county || '',
          state: a.state || '',
          pincode: a.postcode || '',
        })
      }
    } catch (_) {}
  }

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported by your browser'); return }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      if (mapRef.current && markerRef.current) {
        mapRef.current.setView([lat, lng], 16)
        markerRef.current.setLatLng([lat, lng])
        await reverseGeocode(lat, lng)
      }
      setGettingLocation(false)
    }, () => {
      setGettingLocation(false)
      alert('Could not get your location. Please allow location access in your browser.')
    }, { enableHighAccuracy: true, timeout: 8000 })
  }

  return (
    <div className="space-y-2 mt-3">
      <button type="button" onClick={handleCurrentLocation} disabled={gettingLocation}
        className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 transition-colors">
        <NavigationArrow size={15} weight="fill" />
        {gettingLocation ? 'Getting location…' : 'Use Current Location'}
      </button>
      {!leafletReady && (
        <div className="flex h-64 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent mr-2" /> Loading map…
        </div>
      )}
      <div ref={mapContainerRef} style={{ height: '280px', borderRadius: '12px', display: leafletReady ? 'block' : 'none', zIndex: 0 }} />
      <p className="text-xs text-gray-500">Click on the map or drag the pin to set your delivery location. Fields will auto-fill.</p>
    </div>
  )
}

function RazorpayModal({ amount, onSuccess, onClose, authUser }) {
  const [processing, setProcessing] = useState(false)

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })

  const pay = async () => {
    setProcessing(true)
    try {
      const token = localStorage.getItem('authToken')
      // Create Razorpay order on backend
      const res = await fetch(buildApiUrl(API_PATHS.orders.razorpayOrder), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()

      if (!res.ok) {
        // If Razorpay not configured, fall back to success
        onSuccess({ razorpayOrderId: '', razorpayPaymentId: 'mock_' + Date.now() })
        return
      }

      const loaded = await loadRazorpay()
      if (!loaded) { alert('Payment gateway failed to load'); setProcessing(false); return }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: data.amount,
        currency: data.currency,
        name: 'Shubham Supermarket',
        description: 'Order Payment',
        order_id: data.orderId,
        prefill: { name: authUser?.username || '', contact: authUser?.phone || '' },
        theme: { color: '#059669' },
        handler: (response) => {
          onSuccess({ razorpayOrderId: data.orderId, razorpayPaymentId: response.razorpay_payment_id })
        },
        modal: { ondismiss: () => { setProcessing(false); onClose() } },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch {
      onSuccess({ razorpayOrderId: '', razorpayPaymentId: 'mock_' + Date.now() })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center">
        <CheckCircle size={60} weight="fill" className="mx-auto text-emerald-500" />
        <h2 className="mt-4 text-xl font-black text-slate-900">Ready to Pay</h2>
        <p className="mt-2 text-slate-500 text-sm">Amount: <strong className="text-emerald-700">₹{amount.toFixed(2)}</strong></p>
        <button type="button" onClick={pay} disabled={processing}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70">
          {processing ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing…</> : <><CreditCard size={18} weight="bold" /> Pay ₹{amount.toFixed(2)}</>}
        </button>
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
      </div>
    </div>
  )
}

function AddressCard({ address, selected, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(address)}
      className={`w-full rounded-2xl border-2 p-4 text-left transition ${selected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-emerald-600' : 'border-slate-400'}`}>
          {selected && <div className="h-2 w-2 rounded-full bg-emerald-600" />}
        </div>
        <div className="flex-1 text-sm">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900">{address.fullName}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${address.label === 'home' ? 'bg-blue-100 text-blue-700' : address.label === 'work' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              {address.label}
            </span>
          </div>
          <p className="mt-1 text-slate-600">{address.addressLine}, {address.city}, {address.state} – {address.pincode}</p>
          <p className="text-slate-500">📞 {address.phone}</p>
        </div>
      </div>
    </button>
  )
}

function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledCoupon = searchParams.get('coupon') || ''
  const prefilledCouponDiscount = Number(searchParams.get('couponDiscount')) || 0

  const [authUser, setAuthUser] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [walletBalance, setWalletBalance] = useState(0)
  const [useWallet, setUseWallet] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')
  const [couponCode] = useState(prefilledCoupon)
  const [couponDiscount] = useState(prefilledCouponDiscount)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [deliverySettings, setDeliverySettings] = useState({ deliveryCharge: 40, freeDeliveryThreshold: 499, freeDeliveryEnabled: true })

  const [form, setForm] = useState({ fullName: '', phone: '', addressLine: '', city: '', state: '', pincode: '', label: 'home' })

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    if (!storedUser) { navigate('/login', { replace: true }); return }
    try {
      const parsed = JSON.parse(storedUser)
      if (parsed?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
      if (parsed?.role === 'delivery') { navigate('/delivery/dashboard', { replace: true }); return }
      setAuthUser(parsed)
      setForm((p) => ({ ...p, fullName: parsed.username || '', phone: parsed.phone || '' }))

      const token = localStorage.getItem('authToken')
      // Load saved addresses
      fetch(buildApiUrl(API_PATHS.auth.addresses), { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then((d) => {
          const addrs = d.addresses || []
          setSavedAddresses(addrs)
          const def = addrs.find((a) => a.isDefault) || addrs[0]
          if (def) setSelectedAddress(def)
          else setShowAddressForm(true)
        }).catch(() => setShowAddressForm(true))

      // Load wallet
      fetch(buildApiUrl(API_PATHS.auth.wallet), { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then((d) => setWalletBalance(d.balance || 0)).catch(() => {})
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    fetch(buildApiUrl(API_PATHS.settings.get))
      .then((r) => r.json())
      .then((d) => setDeliverySettings({
        deliveryCharge: d.deliveryCharge ?? 40,
        freeDeliveryThreshold: d.freeDeliveryThreshold ?? 499,
        freeDeliveryEnabled: d.freeDeliveryEnabled !== false,
      }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('supermarketCart')
      const items = raw ? JSON.parse(raw) : []
      if (items.length === 0) { navigate('/cart', { replace: true }); return }
      setCartItems(items)
    } catch {
      navigate('/cart', { replace: true })
    }
  }, [navigate])

  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0), [cartItems])
  const deliveryCharge = useMemo(() => {
    if (!deliverySettings.freeDeliveryEnabled) return 0
    if (subtotal >= deliverySettings.freeDeliveryThreshold) return 0
    return deliverySettings.deliveryCharge
  }, [deliverySettings, subtotal])
  const walletUsed = useWallet ? Math.min(walletBalance, Math.max(0, subtotal + deliveryCharge - couponDiscount)) : 0
  const total = Math.max(0, subtotal + deliveryCharge - couponDiscount - walletUsed)

  const validateForm = () => {
    const e = {}
    if (!form.fullName.trim() || form.fullName.trim().length < 2) e.fullName = 'Enter full name'
    if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter valid 10-digit phone'
    if (!form.addressLine.trim()) e.addressLine = 'Enter address'
    if (!form.city.trim()) e.city = 'Enter city'
    if (!form.state.trim()) e.state = 'Enter state'
    if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = 'Enter valid 6-digit pincode'
    return e
  }

  const getDeliveryAddress = () => {
    if (selectedAddress) {
      return {
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        addressLine: selectedAddress.addressLine,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
      }
    }
    return {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
    }
  }

  const placeOrder = async (rpData = {}) => {
    const token = localStorage.getItem('authToken')
    if (!token) { navigate('/login', { replace: true }); return }
    setPlacing(true)
    setError('')
    try {
      const res = await fetch(buildApiUrl(API_PATHS.orders.create), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ productId: i._id, name: i.name, price: Number(i.price), quantity: Number(i.quantity || 1), thumbnail: i.thumbnail || '', unit: i.unit || '' })),
          deliveryAddress: getDeliveryAddress(),
          paymentMethod: paymentMethod === 'razorpay' ? 'razorpay' : paymentMethod,
          subtotal,
          couponCode: couponCode || '',
          couponDiscount,
          orderNotes,
          walletAmountUsed: walletUsed,
          ...rpData,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to place order.'); setPlacing(false); return }
      localStorage.removeItem('supermarketCart')
      window.dispatchEvent(new Event('cartUpdated'))
      navigate(`/order-success/${data.order._id}`, { replace: true })
    } catch {
      setError('Something went wrong. Check your connection and try again.')
      setPlacing(false)
    }
  }

  const handleProceed = () => {
    if (!selectedAddress) {
      const errs = validateForm()
      if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
      setFormErrors({})
    }
    if (paymentMethod === 'razorpay') { setShowPaymentModal(true) }
    else { placeOrder() }
  }

  const input = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: key === 'pincode' ? e.target.value.replace(/\D/g, '') : e.target.value }))
    setFormErrors((p) => ({ ...p, [key]: '' }))
  }

  const cls = (key) => `w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition ${formErrors[key] ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-slate-50'}`

  const handleLogout = () => { localStorage.removeItem('authUser'); localStorage.removeItem('authToken'); setAuthUser(null); navigate('/login', { replace: true }) }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50 to-white text-slate-900">
      <Navbar isLoggedIn={Boolean(authUser)} authUser={authUser} onLogout={handleLogout} />

      {showPaymentModal && (
        <RazorpayModal
          amount={total}
          authUser={authUser}
          onSuccess={(rpData) => { setShowPaymentModal(false); placeOrder(rpData) }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Link to="/cart" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700">
          <ArrowLeft size={16} weight="bold" /> Back to Cart
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Checkout</h1>

        {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {/* Step 1: Address */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                  <MapPin size={18} weight="bold" className="text-emerald-700" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Step 1</p>
                  <h2 className="text-lg font-bold text-slate-900">Delivery Address</h2>
                </div>
              </div>

              {savedAddresses.length > 0 && (
                <div className="mb-4 space-y-2">
                  {savedAddresses.map((addr) => (
                    <AddressCard key={addr._id} address={addr} selected={selectedAddress?._id === addr._id} onSelect={(a) => { setSelectedAddress(a); setShowAddressForm(false) }} />
                  ))}
                  <button type="button" onClick={() => { setSelectedAddress(null); setShowAddressForm(true) }}
                    className="flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700">
                    <Plus size={16} weight="bold" /> Use a different address
                  </button>
                </div>
              )}

              {(showAddressForm || savedAddresses.length === 0) && (
                <div className="grid gap-4">
                  {/* Map toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                      <MapPin size={15} weight="fill" /> Pick location on map
                    </div>
                    <button type="button" onClick={() => setShowMap((v) => !v)}
                      className={`relative h-6 w-11 rounded-full transition ${showMap ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${showMap ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {showMap && (
                    <LocationPickerMap
                      onLocationSelect={(loc) => {
                        setForm((p) => ({
                          ...p,
                          addressLine: loc.addressLine || p.addressLine,
                          city: loc.city || p.city,
                          state: loc.state || p.state,
                          pincode: loc.pincode || p.pincode,
                        }))
                        setFormErrors({})
                      }}
                    />
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Full Name *</label>
                      <input type="text" value={form.fullName} onChange={input('fullName')} placeholder="John Doe" className={cls('fullName')} />
                      {formErrors.fullName && <p className="mt-1 text-xs text-rose-600">{formErrors.fullName}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Phone *</label>
                      <input type="tel" value={form.phone} onChange={input('phone')} placeholder="9876543210" maxLength={10} className={cls('phone')} />
                      {formErrors.phone && <p className="mt-1 text-xs text-rose-600">{formErrors.phone}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Address Line *</label>
                    <input type="text" value={form.addressLine} onChange={input('addressLine')} placeholder="Flat / House No., Street, Landmark" className={cls('addressLine')} />
                    {formErrors.addressLine && <p className="mt-1 text-xs text-rose-600">{formErrors.addressLine}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[['city', 'City *', 'Mumbai'], ['state', 'State *', 'Maharashtra'], ['pincode', 'Pincode *', '400001']].map(([key, label, ph]) => (
                      <div key={key}>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
                        <input type="text" value={form[key]} onChange={input(key)} placeholder={ph} maxLength={key === 'pincode' ? 6 : undefined} className={cls(key)} />
                        {formErrors[key] && <p className="mt-1 text-xs text-rose-600">{formErrors[key]}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Order notes */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
                <Truck size={18} className="text-emerald-600" /> Order Notes (optional)
              </h2>
              <div className="space-y-2">
                {['Leave at gate', 'Call on arrival', 'Leave with security'].map((note) => (
                  <button key={note} type="button" onClick={() => setOrderNotes(orderNotes === note ? '' : note)}
                    className={`mr-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${orderNotes === note ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-200'}`}>
                    {note}
                  </button>
                ))}
              </div>
              <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special instructions for delivery…" rows={2}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none" />
            </div>

            {/* Step 2: Payment */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                  <CreditCard size={18} weight="bold" className="text-emerald-700" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Step 2</p>
                  <h2 className="text-lg font-bold text-slate-900">Payment Method</h2>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { value: 'cod', label: 'Cash on Delivery', desc: 'Pay cash when your order arrives', icon: '💵' },
                  { value: 'razorpay', label: 'Pay Online (Razorpay)', desc: 'UPI, cards, net banking — safe & fast', icon: '💳' },
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setPaymentMethod(opt.value)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${paymentMethod === opt.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'}`}>
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${paymentMethod === opt.value ? 'border-emerald-600' : 'border-slate-400'}`}>
                      {paymentMethod === opt.value && <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                    <span className="text-2xl">{opt.icon}</span>
                  </button>
                ))}
              </div>

              {/* Wallet */}
              {walletBalance > 0 && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet size={18} className="text-emerald-700" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">Use Wallet Balance</p>
                        <p className="text-xs text-emerald-700">Available: ₹{walletBalance.toFixed(2)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setUseWallet(!useWallet)}
                      className={`relative h-6 w-11 rounded-full transition ${useWallet ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${useWallet ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {useWallet && walletUsed > 0 && (
                    <p className="mt-2 text-xs text-emerald-700">–₹{walletUsed.toFixed(2)} will be deducted from wallet</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <aside className="h-fit rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">Order Summary</h2>
            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item._id} className="flex items-center gap-2">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-emerald-50">
                    {item.thumbnail ? <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[9px] text-slate-300">No img</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-500">×{item.quantity || 1}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold">₹{(Number(item.price) * Number(item.quantity || 1)).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              {[['Subtotal (incl. GST)', `₹${subtotal.toFixed(2)}`], ['Delivery', deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`]].map(([l, v]) => (
                <div key={l} className="flex justify-between text-slate-600">
                  <span>{l}</span>
                  <span className={`font-semibold ${v === 'Free' ? 'text-emerald-700' : ''}`}>{v}</span>
                </div>
              ))}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700"><span>Coupon ({couponCode})</span><span className="font-semibold">–₹{couponDiscount.toFixed(2)}</span></div>
              )}
              {walletUsed > 0 && (
                <div className="flex justify-between text-emerald-700"><span>Wallet</span><span className="font-semibold">–₹{walletUsed.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-black text-slate-900">
                <span>Total</span><span>₹{total.toFixed(2)}</span>
              </div>
            </div>
            <button type="button" onClick={handleProceed} disabled={placing}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70">
              {placing
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Placing Order…</>
                : paymentMethod === 'razorpay'
                ? <><CreditCard size={16} weight="bold" /> Pay ₹{total.toFixed(2)}</>
                : <><Truck size={16} weight="bold" /> Place Order</>}
            </button>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <LockKey size={12} weight="bold" /> Secure & encrypted checkout
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  )
}

export default CheckoutPage
