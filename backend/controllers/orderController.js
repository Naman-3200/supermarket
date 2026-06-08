const Order = require('../models/Order')
const User = require('../models/User')
const Settings = require('../models/Settings')
const asyncHandler = require('../utils/asyncHandler')

const MIN_ORDER_AMOUNT = 99
const DEFAULT_DELIVERY_CHARGE = 40
const DEFAULT_FREE_DELIVERY_THRESHOLD = 499

async function getDeliverySettings() {
  const settings = await Settings.find({ key: { $in: ['deliveryCharge', 'freeDeliveryThreshold', 'freeDeliveryEnabled'] } }).lean()
  const map = {}
  for (const s of settings) map[s.key] = s.value
  return {
    deliveryCharge: map.deliveryCharge ?? DEFAULT_DELIVERY_CHARGE,
    freeDeliveryThreshold: map.freeDeliveryThreshold ?? DEFAULT_FREE_DELIVERY_THRESHOLD,
    freeDeliveryEnabled: map.freeDeliveryEnabled ?? true,
  }
}

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    deliveryAddress,
    paymentMethod,
    subtotal,
    couponCode,
    couponDiscount,
    orderNotes,
    walletAmountUsed,
    razorpayOrderId,
    razorpayPaymentId,
  } = req.body

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'Order must contain at least one item' })
  }

  if (!['cod', 'online', 'wallet', 'razorpay'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Invalid payment method' })
  }

  const validSubtotal = Number(subtotal) || 0
  if (validSubtotal < MIN_ORDER_AMOUNT) {
    return res.status(400).json({ message: `Minimum order amount is ₹${MIN_ORDER_AMOUNT}` })
  }

  const { deliveryCharge: DC, freeDeliveryThreshold: FDT, freeDeliveryEnabled } = await getDeliverySettings()
  const deliveryCharge = !freeDeliveryEnabled || validSubtotal >= FDT ? 0 : DC

  const validCouponDiscount = Number(couponDiscount) || 0
  const validWalletUsed = Number(walletAmountUsed) || 0

  if (validWalletUsed > 0) {
    const user = await User.findById(req.user._id)
    if (user.wallet.balance < validWalletUsed) {
      return res.status(400).json({ message: 'Insufficient wallet balance' })
    }
  }

  const totalAmount = parseFloat(
    (validSubtotal + deliveryCharge - validCouponDiscount - validWalletUsed).toFixed(2),
  )

  const order = await Order.create({
    userId: req.user._id,
    items,
    deliveryAddress,
    paymentMethod,
    paymentStatus: ['online', 'razorpay', 'wallet'].includes(paymentMethod) ? 'paid' : 'pending',
    orderStatus: 'pending',
    subtotal: validSubtotal,
    deliveryCharge,
    taxAmount: 0,
    couponCode: couponCode || '',
    couponDiscount: validCouponDiscount,
    walletAmountUsed: validWalletUsed,
    totalAmount,
    orderNotes: orderNotes || '',
    razorpayOrderId: razorpayOrderId || '',
    razorpayPaymentId: razorpayPaymentId || '',
  })

  if (validWalletUsed > 0) {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'wallet.balance': -validWalletUsed },
      $push: {
        'wallet.transactions': {
          type: 'debit',
          amount: validWalletUsed,
          description: `Used for order ${order.orderNumber}`,
          orderId: order._id,
        },
      },
    })
  }

  res.status(201).json({ message: 'Order placed successfully', order })
})

const createRazorpayOrder = asyncHandler(async (req, res) => {
  const Razorpay = require('razorpay')
  const { amount } = req.body

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ message: 'Payment gateway not configured' })
  }

  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })

  const rpOrder = await instance.orders.create({
    amount: Math.round(Number(amount) * 100),
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
  })

  res.status(200).json({ orderId: rpOrder.id, currency: rpOrder.currency, amount: rpOrder.amount })
})

const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id })
    .populate('assignedDeliveryPartner', 'username phone vehicleNumber')
    .sort({ createdAt: -1 })
  res.json({ orders })
})

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('assignedDeliveryPartner', 'username phone vehicleNumber deliveryStatus')
  if (!order) return res.status(404).json({ message: 'Order not found' })
  res.json({ order })
})

const getAllOrders = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.status) filter.orderStatus = req.query.status

  const orders = await Order.find(filter)
    .populate('userId', 'username email phone')
    .populate('assignedDeliveryPartner', 'username phone vehicleNumber')
    .sort({ createdAt: -1 })
  res.json({ orders })
})

const getDeliveryOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ assignedDeliveryPartner: req.user._id })
    .populate('userId', 'username email phone')
    .sort({ createdAt: -1 })
  res.json({ orders })
})

const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
  if (!order) return res.status(404).json({ message: 'Order not found' })

  const cancellableStatuses = ['pending', 'placed', 'confirmed']
  if (!cancellableStatuses.includes(order.orderStatus)) {
    return res.status(400).json({ message: 'Order cannot be cancelled at this stage' })
  }

  order.orderStatus = 'cancelled'
  order.cancelReason = reason || 'Cancelled by customer'
  order.cancelledAt = new Date()

  if (order.walletAmountUsed > 0) {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'wallet.balance': order.walletAmountUsed },
      $push: {
        'wallet.transactions': {
          type: 'credit',
          amount: order.walletAmountUsed,
          description: `Refund for cancelled order ${order.orderNumber}`,
          orderId: order._id,
        },
      },
    })
  }

  if (order.paymentStatus === 'paid' && order.paymentMethod !== 'cod') {
    order.paymentStatus = 'refunded'
    order.refundAmount = order.totalAmount
  }

  await order.save()
  res.json({ message: 'Order cancelled successfully', order })
})

const requestReturn = asyncHandler(async (req, res) => {
  const { reason } = req.body
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
  if (!order) return res.status(404).json({ message: 'Order not found' })

  if (order.orderStatus !== 'delivered') {
    return res.status(400).json({ message: 'Return can only be requested for delivered orders' })
  }

  if (order.returnRequest?.requested) {
    return res.status(400).json({ message: 'Return already requested for this order' })
  }

  const deliveredAt = order.updatedAt
  const hoursSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60)
  if (hoursSinceDelivery > 24) {
    return res.status(400).json({ message: 'Return window has expired (24 hours from delivery)' })
  }

  order.orderStatus = 'returned'
  order.returnRequest = { reason: reason || '', requestedAt: new Date(), status: 'pending' }
  await order.save()

  res.json({ message: 'Return request submitted', order })
})

const verifyDeliveryOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })

  if (req.user.role === 'delivery') {
    if (!order.assignedDeliveryPartner || String(order.assignedDeliveryPartner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'This order is not assigned to you' })
    }
  }

  if (!order.deliveryOtp) {
    return res.status(400).json({ message: 'No OTP generated for this order' })
  }

  if (String(otp) !== String(order.deliveryOtp)) {
    return res.status(400).json({ message: 'Invalid OTP' })
  }

  order.deliveryOtpVerified = true
  await order.save()
  res.json({ message: 'OTP verified successfully' })
})

const getOrderInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('assignedDeliveryPartner', 'username phone')
    .populate('items.productId', 'hsnCode gstRate')
  if (!order) return res.status(404).json({ message: 'Order not found' })

  const itemRows = order.items
    .map((item) => {
      const hsnCode = item.productId?.hsnCode || ''
      const gstRate = item.productId?.gstRate || 0
      const lineTotal = item.price * item.quantity
      const taxableBase = gstRate > 0 ? parseFloat((lineTotal * 100 / (100 + gstRate)).toFixed(2)) : lineTotal
      const gstAmount = gstRate > 0 ? parseFloat((lineTotal - taxableBase).toFixed(2)) : 0
      return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${item.name}${hsnCode ? `<br/><span style="font-size:10px;color:#94a3b8">HSN: ${hsnCode}</span>` : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${item.unit || '-'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">₹${Number(item.price).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">₹${lineTotal.toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${gstRate > 0 ? `${gstRate}%` : 'Nil'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${gstAmount > 0 ? `₹${gstAmount.toFixed(2)}` : '—'}</td>
    </tr>`
    })
    .join('')

  const totalGst = order.items.reduce((sum, item) => {
    const gstRate = item.productId?.gstRate || 0
    if (!gstRate) return sum
    const lineTotal = item.price * item.quantity
    const taxableBase = lineTotal * 100 / (100 + gstRate)
    return sum + (lineTotal - taxableBase)
  }, 0)

  const gstBreakdown = {}
  for (const item of order.items) {
    const gstRate = item.productId?.gstRate || 0
    if (!gstRate) continue
    const lineTotal = item.price * item.quantity
    const taxableBase = lineTotal * 100 / (100 + gstRate)
    const gstAmt = lineTotal - taxableBase
    gstBreakdown[gstRate] = (gstBreakdown[gstRate] || 0) + gstAmt
  }

  const gstRows = Object.entries(gstBreakdown).map(([rate, amt]) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">GST @ ${rate}%</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">Included in price</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${Number(amt).toFixed(2)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice – ${order.orderNumber}</title>
<style>
  body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:32px;background:#fff}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
  .brand{font-size:24px;font-weight:900;color:#059669}
  .invoice-title{font-size:13px;color:#64748b;margin-top:4px}
  .section{margin-bottom:24px}
  .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}
  th{padding:10px 12px;background:#f1f5f9;text-align:left;font-size:12px;font-weight:700;color:#475569}
  .totals{width:320px;margin-left:auto;margin-top:16px}
  .totals tr td{padding:6px 12px;font-size:13px}
  .totals tr:last-child td{font-weight:700;font-size:15px;border-top:2px solid #e2e8f0;padding-top:10px}
  .gst-table{margin-top:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
  .gst-table th{background:#f8fafc}
  .badge{display:inline-block;padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;background:#d1fae5;color:#065f46}
  @media print{body{padding:0}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand">Shubham Supermarket</div>
    <div class="invoice-title">TAX INVOICE</div>
    <div style="font-size:11px;color:#64748b;margin-top:2px">Charni Road, Mumbai – 400004</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:20px;font-weight:700">#${order.orderNumber}</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    <div style="margin-top:6px"><span class="badge">${order.orderStatus.replace(/_/g, ' ').toUpperCase()}</span></div>
  </div>
</div>

<div style="display:flex;gap:48px;margin-bottom:32px">
  <div class="section" style="flex:1">
    <div class="section-title">Bill To</div>
    <div style="font-weight:600">${order.deliveryAddress.fullName}</div>
    <div style="font-size:13px;color:#475569;margin-top:4px">${order.deliveryAddress.addressLine}</div>
    <div style="font-size:13px;color:#475569">${order.deliveryAddress.city}, ${order.deliveryAddress.state} – ${order.deliveryAddress.pincode}</div>
    <div style="font-size:13px;color:#475569;margin-top:4px">📞 ${order.deliveryAddress.phone}</div>
  </div>
  <div class="section" style="min-width:200px">
    <div class="section-title">Payment</div>
    <div style="font-size:13px"><b>Method:</b> ${order.paymentMethod.toUpperCase()}</div>
    <div style="font-size:13px"><b>Status:</b> ${order.paymentStatus.toUpperCase()}</div>
    ${order.couponCode ? `<div style="font-size:13px"><b>Coupon:</b> ${order.couponCode}</div>` : ''}
    <div style="font-size:11px;color:#64748b;margin-top:6px">* All prices are inclusive of GST</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Item</th>
      <th>Unit</th>
      <th style="text-align:center">Qty</th>
      <th style="text-align:right">Rate</th>
      <th style="text-align:right">Amount</th>
      <th style="text-align:right">GST %</th>
      <th style="text-align:right">GST (incl.)</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<table class="totals">
  <tr><td>Subtotal</td><td style="text-align:right">₹${Number(order.subtotal || order.totalAmount).toFixed(2)}</td></tr>
  ${order.deliveryCharge > 0 ? `<tr><td>Delivery Charge</td><td style="text-align:right">₹${order.deliveryCharge.toFixed(2)}</td></tr>` : '<tr><td>Delivery</td><td style="text-align:right;color:#059669">Free</td></tr>'}
  ${order.couponDiscount > 0 ? `<tr><td>Coupon Discount</td><td style="text-align:right;color:#059669">–₹${order.couponDiscount.toFixed(2)}</td></tr>` : ''}
  ${order.walletAmountUsed > 0 ? `<tr><td>Wallet Used</td><td style="text-align:right;color:#059669">–₹${order.walletAmountUsed.toFixed(2)}</td></tr>` : ''}
  <tr><td>Total</td><td style="text-align:right">₹${Number(order.totalAmount).toFixed(2)}</td></tr>
</table>

${totalGst > 0 ? `
<div class="gst-table" style="margin-top:32px">
  <div style="padding:10px 12px;background:#f8fafc;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#475569;border-bottom:1px solid #e2e8f0">
    GST Summary (Included in Product Prices)
  </div>
  <table>
    <thead>
      <tr>
        <th>GST Rate</th>
        <th style="text-align:right">Basis</th>
        <th style="text-align:right">Tax Amount</th>
      </tr>
    </thead>
    <tbody>
      ${gstRows}
      <tr style="background:#f8fafc;font-weight:700">
        <td style="padding:8px 12px">Total GST (Incl.)</td>
        <td style="padding:8px 12px;text-align:right">—</td>
        <td style="padding:8px 12px;text-align:right">₹${totalGst.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
</div>` : ''}

<div style="margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
  Thank you for shopping with Shubham Supermarket! &nbsp;|&nbsp; Charni Road, Mumbai – 400004
</div>

<script>window.onload = function(){ window.print() }</script>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html')
  res.send(html)
})

const reorder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
  if (!order) return res.status(404).json({ message: 'Order not found' })

  const cartItems = order.items.map((item) => ({
    _id: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    thumbnail: item.thumbnail,
    unit: item.unit,
    isActive: true,
  }))

  res.json({ message: 'Items ready to re-add to cart', items: cartItems })
})

const assignDeliveryPartner = asyncHandler(async (req, res) => {
  const { deliveryPartnerId, deliveryEarnings } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })

  if (deliveryPartnerId) {
    const partner = await User.findOne({ _id: deliveryPartnerId, role: 'delivery' })
    if (!partner) return res.status(404).json({ message: 'Delivery partner not found' })
    order.assignedDeliveryPartner = deliveryPartnerId
    if (['pending', 'placed'].includes(order.orderStatus)) order.orderStatus = 'confirmed'
  } else {
    order.assignedDeliveryPartner = null
  }

  if (deliveryEarnings !== undefined && deliveryEarnings !== null) {
    const val = Number(deliveryEarnings)
    if (!isNaN(val) && val >= 0) order.deliveryEarnings = val
  }

  await order.save()
  const populated = await order.populate('assignedDeliveryPartner', 'username phone vehicleNumber')
  res.json({ message: 'Delivery partner assigned', order: populated })
})

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus } = req.body
  const validStatuses = [
    'pending', 'placed', 'confirmed', 'processing', 'packed',
    'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded', 'failed_delivery',
  ]

  if (!validStatuses.includes(orderStatus)) {
    return res.status(400).json({ message: 'Invalid order status' })
  }

  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })

  if (req.user.role === 'delivery') {
    if (!order.assignedDeliveryPartner || String(order.assignedDeliveryPartner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'This order is not assigned to you' })
    }
    const allowedByDelivery = ['processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'failed_delivery']
    if (!allowedByDelivery.includes(orderStatus)) {
      return res.status(403).json({ message: 'Not allowed' })
    }

    if (orderStatus === 'delivered') {
      if (!order.deliveryOtpVerified) {
        return res.status(400).json({ message: 'OTP verification required before marking as delivered' })
      }
    }
  }

  order.orderStatus = orderStatus

  if (orderStatus === 'shipped' && !order.deliveryOtp) {
    order.deliveryOtp = generateOtp()
    order.deliveryOtpVerified = false
  }

  if (orderStatus === 'delivered' && order.paymentMethod === 'cod') {
    order.paymentStatus = 'paid'
  }

  await order.save()
  res.json({ message: 'Order status updated', order })
})

const rejectDeliveryOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })

  if (!order.assignedDeliveryPartner || String(order.assignedDeliveryPartner) !== String(req.user._id)) {
    return res.status(403).json({ message: 'This order is not assigned to you' })
  }

  if (['delivered', 'cancelled', 'failed_delivery'].includes(order.orderStatus)) {
    return res.status(400).json({ message: 'Cannot reject a completed order' })
  }

  order.assignedDeliveryPartner = null
  order.orderStatus = 'pending'
  await order.save()
  res.json({ message: 'Delivery rejected', order })
})

const addDeliveryProof = asyncHandler(async (req, res) => {
  const { proofImageUrl, failureReason } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })

  if (req.user.role === 'delivery') {
    if (!order.assignedDeliveryPartner || String(order.assignedDeliveryPartner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'This order is not assigned to you' })
    }
  }

  if (proofImageUrl !== undefined) order.deliveryProofImage = proofImageUrl
  if (failureReason !== undefined) order.failureReason = failureReason
  await order.save()
  res.json({ message: 'Delivery proof updated', order })
})

module.exports = {
  createOrder,
  createRazorpayOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  getDeliveryOrders,
  cancelOrder,
  requestReturn,
  verifyDeliveryOtp,
  getOrderInvoice,
  reorder,
  assignDeliveryPartner,
  updateOrderStatus,
  rejectDeliveryOrder,
  addDeliveryProof,
}
