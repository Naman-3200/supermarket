const express = require('express')
const {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  getDeliveryOrders,
  assignDeliveryPartner,
  updateOrderStatus,
  rejectDeliveryOrder,
  addDeliveryProof,
} = require('../controllers/orderController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

router.use(protect)

router.post('/', createOrder)
router.get('/my-orders', getUserOrders)
router.get('/delivery-orders', restrictTo('delivery'), getDeliveryOrders)
router.get('/', restrictTo('admin'), getAllOrders)
router.get('/:id', getOrderById)
router.patch('/:id/assign', restrictTo('admin'), assignDeliveryPartner)
router.patch('/:id/status', restrictTo('admin', 'delivery'), updateOrderStatus)
router.patch('/:id/reject-delivery', restrictTo('delivery'), rejectDeliveryOrder)
router.patch('/:id/proof', restrictTo('admin', 'delivery'), addDeliveryProof)

module.exports = router
