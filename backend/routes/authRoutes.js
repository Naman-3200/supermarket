const express = require('express')
const { body } = require('express-validator')
const { signup, login, getCurrentUser, getAllUsers, toggleBlockUser, updateUser, deleteUser } = require('../controllers/authController')
const validateRequest = require('../middlewares/validateRequest')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

router.post(
  '/signup',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('phone').trim().isLength({ min: 8, max: 15 }).withMessage('Valid phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required'),
    body('role').optional().isIn(['user', 'delivery']).withMessage('Role must be user or delivery'),
    body('vehicleNumber')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 3 })
      .withMessage('Vehicle number must be at least 3 characters'),
  ],
  validateRequest,
  signup,
)

router.post(
  '/login',
  [
    body('identifier').trim().notEmpty().withMessage('Email/phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  login,
)

router.get('/me', protect, getCurrentUser)
router.get('/users', protect, restrictTo('admin'), getAllUsers)
router.patch('/:id/toggle-block', protect, restrictTo('admin'), toggleBlockUser)
router.put('/:id', protect, restrictTo('admin'), updateUser)
router.delete('/:id', protect, restrictTo('admin'), deleteUser)

module.exports = router
