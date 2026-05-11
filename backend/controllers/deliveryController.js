const Order = require('../models/Order')
const User = require('../models/User')
const asyncHandler = require('../utils/asyncHandler')

const DELIVERY_FEE = 30 // ₹30 flat rate per delivered order

const getDeliveryAnalytics = asyncHandler(async (req, res) => {
  const deliveryPartnerId = req.user._id

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 6)
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const allOrders = await Order.find({ assignedDeliveryPartner: deliveryPartnerId })
    .sort({ updatedAt: -1 })
    .lean()

  const deliveredOrders = allOrders.filter((o) => o.orderStatus === 'delivered')
  const todayDelivered = deliveredOrders.filter((o) => new Date(o.updatedAt) >= startOfToday)
  const weekDelivered = deliveredOrders.filter((o) => new Date(o.updatedAt) >= startOfWeek)
  const monthDelivered = deliveredOrders.filter((o) => new Date(o.updatedAt) >= startOfMonth)
  const activeOrders = allOrders.filter((o) => ['confirmed', 'processing', 'shipped'].includes(o.orderStatus))
  const failedOrders = allOrders.filter((o) => o.orderStatus === 'failed_delivery')

  // Last 7 days bar chart data
  const weeklyStats = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(now.getDate() - i)
    day.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setDate(day.getDate() + 1)
    const count = deliveredOrders.filter((o) => {
      const d = new Date(o.updatedAt)
      return d >= day && d < dayEnd
    }).length
    weeklyStats.push({
      day: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: day.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      count,
      earnings: count * DELIVERY_FEE,
    })
  }

  // Recent payouts (last 10 delivered orders as earning entries)
  const recentEarnings = deliveredOrders.slice(0, 10).map((o) => ({
    orderId: o._id,
    orderNumber: o.orderNumber,
    amount: DELIVERY_FEE,
    date: o.updatedAt,
    customerName: o.deliveryAddress?.fullName || '',
  }))

  res.json({
    analytics: {
      totalAssigned: allOrders.length,
      totalDelivered: deliveredOrders.length,
      totalFailed: failedOrders.length,
      activeOrders: activeOrders.length,
      todayDelivered: todayDelivered.length,
      todayEarnings: todayDelivered.length * DELIVERY_FEE,
      weekDelivered: weekDelivered.length,
      weekEarnings: weekDelivered.length * DELIVERY_FEE,
      monthDelivered: monthDelivered.length,
      monthEarnings: monthDelivered.length * DELIVERY_FEE,
      totalEarnings: deliveredOrders.length * DELIVERY_FEE,
      weeklyStats,
      recentEarnings,
      deliveryFeePerOrder: DELIVERY_FEE,
      deliveryStatus: req.user.deliveryStatus,
      shiftStart: req.user.shiftStart,
      shiftEnd: req.user.shiftEnd,
    },
  })
})

const updateAvailability = asyncHandler(async (req, res) => {
  const { deliveryStatus, shiftStart, shiftEnd } = req.body

  const user = await User.findById(req.user._id)
  if (!user) return res.status(404).json({ message: 'User not found' })

  if (deliveryStatus && ['offline', 'online', 'break'].includes(deliveryStatus)) {
    user.deliveryStatus = deliveryStatus
  }
  if (shiftStart !== undefined) user.shiftStart = shiftStart
  if (shiftEnd !== undefined) user.shiftEnd = shiftEnd

  await user.save()

  res.json({
    message: 'Availability updated',
    deliveryStatus: user.deliveryStatus,
    shiftStart: user.shiftStart,
    shiftEnd: user.shiftEnd,
  })
})

module.exports = { getDeliveryAnalytics, updateAvailability }
