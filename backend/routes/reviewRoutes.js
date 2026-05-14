const express = require('express')
const { getProductReviews, addReview, updateReview, deleteReview, getMyReviews } = require('../controllers/reviewController')
const { protect } = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/product/:productId', getProductReviews)
router.get('/my-reviews', protect, getMyReviews)
router.post('/', protect, addReview)
router.put('/:id', protect, updateReview)
router.delete('/:id', protect, deleteReview)

module.exports = router
