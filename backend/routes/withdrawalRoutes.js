const express = require('express')
const {
  createWithdrawalRequest, getMyWithdrawalRequests,
  getAllWithdrawalRequests, updateWithdrawalStatus,
} = require('../controllers/withdrawalController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

router.use(protect)

router.post('/', restrictTo('delivery'), createWithdrawalRequest)
router.get('/my-requests', restrictTo('delivery'), getMyWithdrawalRequests)
router.get('/', restrictTo('admin'), getAllWithdrawalRequests)
router.patch('/:id', restrictTo('admin'), updateWithdrawalStatus)

module.exports = router
