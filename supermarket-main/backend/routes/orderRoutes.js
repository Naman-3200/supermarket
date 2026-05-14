const express = require('express')
const {
  createOrder, createRazorpayOrder,
  getUserOrders, getOrderById,
  getAllOrders, getDeliveryOrders,
  cancelOrder, requestReturn, getOrderInvoice, reorder,
  assignDeliveryPartner, updateOrderStatus, rejectDeliveryOrder, addDeliveryProof,
} = require('../controllers/orderController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

router.use(protect)

// Customer routes
router.post('/', restrictTo('user'), createOrder)
router.post('/razorpay-order', restrictTo('user'), createRazorpayOrder)
router.get('/my-orders', restrictTo('user'), getUserOrders)
router.post('/:id/cancel', restrictTo('user'), cancelOrder)
router.post('/:id/return', restrictTo('user'), requestReturn)
router.get('/:id/invoice', restrictTo('user'), getOrderInvoice)
router.get('/:id/reorder', restrictTo('user'), reorder)

// Delivery partner routes
router.get('/delivery-orders', restrictTo('delivery'), getDeliveryOrders)
router.patch('/:id/reject-delivery', restrictTo('delivery'), rejectDeliveryOrder)

// Admin routes
router.get('/', restrictTo('admin'), getAllOrders)
router.patch('/:id/assign', restrictTo('admin'), assignDeliveryPartner)

// Shared admin + delivery
router.patch('/:id/status', restrictTo('admin', 'delivery'), updateOrderStatus)
router.patch('/:id/proof', restrictTo('admin', 'delivery'), addDeliveryProof)

// Generic (user, admin can view any of their own orders)
router.get('/:id', getOrderById)

module.exports = router
