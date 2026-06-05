const express = require('express')
const { getSettings, updateSettings } = require('../controllers/settingsController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/', getSettings)
router.patch('/', protect, restrictTo('admin'), updateSettings)

module.exports = router
