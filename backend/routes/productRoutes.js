const express = require('express')
const { body } = require('express-validator')
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')
const validateRequest = require('../middlewares/validateRequest')

const router = express.Router()

router.post(
  '/',
  protect,
  restrictTo('admin'),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('categoryId').trim().notEmpty().withMessage('Category ID is required'),
    body('subCategoryId').optional({ checkFalsy: true }).trim(),
    body('description').optional().trim(),
    body('discount').optional().isFloat({ min: 0, max: 100 }),
    body('unit').optional().trim(),
    body('isActive').optional().isBoolean(),
    body('images').isArray({ min: 1, max: 5 }).withMessage('Upload between 1 and 5 product images'),
  ],
  validateRequest,
  createProduct,
)

router.get('/', getAllProducts)
router.get('/:id', getProductById)

router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('price').optional().isFloat({ min: 0 }),
    body('discount').optional().isFloat({ min: 0, max: 100 }),
    body('unit').optional().trim(),
    body('subCategoryId').optional({ checkFalsy: true }).trim(),
    body('images').optional().isArray({ max: 5 }).withMessage('Maximum 5 product images allowed'),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  updateProduct,
)

router.delete('/:id', protect, restrictTo('admin'), deleteProduct)

module.exports = router
