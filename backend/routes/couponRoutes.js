const express = require('express')
const { getAllCoupons, getCouponById, createCoupon, updateCoupon, deleteCoupon, validateCoupon } = require('../controllers/couponController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

router.post('/validate', protect, validateCoupon)

router.use(protect, restrictTo('admin'))
router.get('/', getAllCoupons)
router.get('/:id', getCouponById)
router.post('/', createCoupon)
router.put('/:id', updateCoupon)
router.delete('/:id', deleteCoupon)

module.exports = router
