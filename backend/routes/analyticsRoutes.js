const express = require('express')
const { getDashboardStats } = require('../controllers/analyticsController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/dashboard', protect, restrictTo('admin'), getDashboardStats)

module.exports = router
