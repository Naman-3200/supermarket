const Order = require('../models/Order')
const User = require('../models/User')
const asyncHandler = require('../utils/asyncHandler')

const createOrder = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, paymentMethod, totalAmount } = req.body

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'Order must contain at least one item' })
  }

  if (!['cod', 'online'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Invalid payment method' })
  }

  const order = await Order.create({
    userId: req.user._id,
    items,
    deliveryAddress,
    paymentMethod,
    paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
    totalAmount,
  })

  res.status(201).json({ message: 'Order placed successfully', order })
})

const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id })
    .populate('assignedDeliveryPartner', 'username phone vehicleNumber')
    .sort({ createdAt: -1 })
  res.json({ orders })
})

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('assignedDeliveryPartner', 'username phone vehicleNumber')
  if (!order) {
    return res.status(404).json({ message: 'Order not found' })
  }
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

// Delivery partner: get all orders assigned to them
const getDeliveryOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ assignedDeliveryPartner: req.user._id })
    .populate('userId', 'username email phone')
    .sort({ createdAt: -1 })
  res.json({ orders })
})

// Admin: assign a delivery partner to an order
const assignDeliveryPartner = asyncHandler(async (req, res) => {
  const { deliveryPartnerId } = req.body

  const order = await Order.findById(req.params.id)
  if (!order) {
    return res.status(404).json({ message: 'Order not found' })
  }

  if (deliveryPartnerId) {
    const partner = await User.findOne({ _id: deliveryPartnerId, role: 'delivery' })
    if (!partner) {
      return res.status(404).json({ message: 'Delivery partner not found' })
    }
    order.assignedDeliveryPartner = deliveryPartnerId
    if (order.orderStatus === 'placed') {
      order.orderStatus = 'confirmed'
    }
  } else {
    order.assignedDeliveryPartner = null
  }

  await order.save()

  const populated = await order.populate('assignedDeliveryPartner', 'username phone vehicleNumber')
  res.json({ message: 'Delivery partner assigned', order: populated })
})

// Admin or assigned delivery partner: update order status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus } = req.body
  const validStatuses = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

  if (!validStatuses.includes(orderStatus)) {
    return res.status(400).json({ message: 'Invalid order status' })
  }

  const order = await Order.findById(req.params.id)
  if (!order) {
    return res.status(404).json({ message: 'Order not found' })
  }

  // Delivery partner can only update their own assigned orders and only move forward
  if (req.user.role === 'delivery') {
    if (!order.assignedDeliveryPartner || String(order.assignedDeliveryPartner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'This order is not assigned to you' })
    }
    const allowedByDelivery = ['shipped', 'delivered']
    if (!allowedByDelivery.includes(orderStatus)) {
      return res.status(403).json({ message: 'Delivery partners can only mark orders as shipped or delivered' })
    }
  }

  order.orderStatus = orderStatus
  await order.save()
  res.json({ message: 'Order status updated', order })
})

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  getDeliveryOrders,
  assignDeliveryPartner,
  updateOrderStatus,
}
