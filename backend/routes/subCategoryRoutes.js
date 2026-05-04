const express = require('express')
const { body } = require('express-validator')
const {
  createSubCategory,
  getSubCategoriesByCategoryId,
  getAllSubCategories,
  updateSubCategory,
  deleteSubCategory,
} = require('../controllers/subCategoryController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')
const validateRequest = require('../middlewares/validateRequest')

const router = express.Router()

router.post(
  '/',
  protect,
  restrictTo('admin'),
  [
    body('name').trim().notEmpty().withMessage('SubCategory name is required'),
    body('categoryId').trim().notEmpty().withMessage('Category ID is required'),
    body('description').optional().trim(),
    body('image').optional().trim(),
  ],
  validateRequest,
  createSubCategory,
)

router.get('/', getAllSubCategories)
router.get('/category/:categoryId', getSubCategoriesByCategoryId)

router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('image').optional().trim(),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  updateSubCategory,
)

router.delete('/:id', protect, restrictTo('admin'), deleteSubCategory)

module.exports = router
