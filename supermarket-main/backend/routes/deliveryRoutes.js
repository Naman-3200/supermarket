const express = require('express')
const { getDeliveryAnalytics, updateAvailability } = require('../controllers/deliveryController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

router.use(protect, restrictTo('delivery'))

router.get('/analytics', getDeliveryAnalytics)
router.patch('/availability', updateAvailability)

module.exports = router
