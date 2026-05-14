const express = require('express')
const { body } = require('express-validator')
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')
const validateRequest = require('../middlewares/validateRequest')

const router = express.Router()

router.post(
  '/',
  protect,
  restrictTo('admin'),
  [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('description').optional().trim(),
    body('image').trim().notEmpty().withMessage('Category image is required'),
  ],
  validateRequest,
  createCategory,
)

router.get('/', getAllCategories)
router.get('/:id', getCategoryById)

router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('image').optional().trim().notEmpty(),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  updateCategory,
)

router.delete('/:id', protect, restrictTo('admin'), deleteCategory)

module.exports = router
