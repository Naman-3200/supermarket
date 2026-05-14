const express = require('express')
const { body } = require('express-validator')
const {
  signup, login, getCurrentUser, updateProfile, changePassword,
  forgotPassword, resetPassword, deleteAccount,
  getAddresses, addAddress, updateAddress, deleteAddress,
  getWallet, addWalletMoney,
  getAllUsers, toggleBlockUser, updateUser, deleteUser,
} = require('../controllers/authController')
const validateRequest = require('../middlewares/validateRequest')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

// ─── Public ───────────────────────────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('phone').trim().isLength({ min: 8, max: 15 }).withMessage('Valid phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required'),
    body('role').optional().isIn(['user', 'delivery']).withMessage('Role must be user or delivery'),
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

router.post('/forgot-password', forgotPassword)
router.post('/reset-password/:token', resetPassword)

// ─── Authenticated user ────────────────────────────────────────────────────────
router.get('/me', protect, getCurrentUser)
router.patch('/profile', protect, updateProfile)
router.patch('/change-password', protect, changePassword)
router.delete('/delete-account', protect, deleteAccount)

// Addresses
router.get('/addresses', protect, getAddresses)
router.post('/addresses', protect, addAddress)
router.put('/addresses/:addressId', protect, updateAddress)
router.delete('/addresses/:addressId', protect, deleteAddress)

// Wallet
router.get('/wallet', protect, getWallet)
router.post('/wallet/add', protect, addWalletMoney)

// ─── Admin only ───────────────────────────────────────────────────────────────
router.get('/users', protect, restrictTo('admin'), getAllUsers)
router.patch('/:id/toggle-block', protect, restrictTo('admin'), toggleBlockUser)
router.put('/:id', protect, restrictTo('admin'), updateUser)
router.delete('/:id', protect, restrictTo('admin'), deleteUser)

module.exports = router
