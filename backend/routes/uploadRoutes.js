const express = require('express')
const multer = require('multer')
const { uploadImages } = require('../controllers/uploadController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
})

router.post('/', protect, restrictTo('admin', 'delivery'), upload.array('images', 5), uploadImages)

module.exports = router
