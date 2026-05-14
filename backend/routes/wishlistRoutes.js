const express = require('express')
const { getWishlist, addToWishlist, removeFromWishlist, getWishlistCount } = require('../controllers/wishlistController')
const { protect } = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/', protect, getWishlist)
router.get('/count', protect, getWishlistCount)
router.post('/', protect, addToWishlist)
router.delete('/:productId', protect, removeFromWishlist)

module.exports = router
