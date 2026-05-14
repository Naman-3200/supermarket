const crypto = require('crypto')
const User = require('../models/User')
const asyncHandler = require('../utils/asyncHandler')
const generateToken = require('../utils/generateToken')

const signup = asyncHandler(async (req, res) => {
  const { username, email, phone, password, confirmPassword, role, vehicleNumber } = req.body
  const normalizedRole = role === 'delivery' ? 'delivery' : 'user'

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Password and confirm password do not match' })
  }

  if (normalizedRole === 'delivery' && !String(vehicleNumber || '').trim()) {
    return res.status(400).json({ message: 'Vehicle number is required for delivery account' })
  }

  const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] })
  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      return res.status(409).json({ message: 'Email already registered' })
    }
    return res.status(409).json({ message: 'Phone already registered' })
  }

  const user = await User.create({
    username,
    email,
    phone,
    password,
    role: normalizedRole,
    vehicleNumber: normalizedRole === 'delivery' ? String(vehicleNumber).trim() : '',
  })

  return res.status(201).json({
    message: 'Signup successful',
    user: user.toSafeObject(),
    token: generateToken(user._id),
  })
})

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body
  const normalizedIdentifier = String(identifier).trim().toLowerCase()

  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { phone: String(identifier).trim() }],
  }).select('+password')

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  if (user.isBlocked) {
    return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' })
  }

  return res.status(200).json({
    message: 'Login successful',
    user: user.toSafeObject(),
    token: generateToken(user._id),
  })
})

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  return res.status(200).json({ user: user.toSafeObject() })
})

const updateProfile = asyncHandler(async (req, res) => {
  const { username, email, phone, avatar } = req.body
  const user = await User.findById(req.user._id)

  if (email && email !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } })
    if (existing) return res.status(409).json({ message: 'Email already in use' })
    user.email = email.toLowerCase()
  }

  if (phone && phone !== user.phone) {
    const existing = await User.findOne({ phone, _id: { $ne: user._id } })
    if (existing) return res.status(409).json({ message: 'Phone already in use' })
    user.phone = phone
  }

  if (username) user.username = username
  if (avatar !== undefined) user.avatar = avatar

  await user.save()
  return res.status(200).json({ message: 'Profile updated', user: user.toSafeObject() })
})

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' })
  }

  const user = await User.findById(req.user._id).select('+password')
  const isMatch = await user.comparePassword(currentPassword)
  if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' })

  user.password = newPassword
  await user.save()

  return res.status(200).json({ message: 'Password changed successfully' })
})

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email: email?.toLowerCase() })

  if (!user) {
    // Return success to avoid email enumeration
    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' })
  }

  const resetToken = user.createPasswordResetToken()
  await user.save({ validateBeforeSave: false })

  // In production, send email here. For dev, return token directly.
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`

  return res.status(200).json({
    message: 'Password reset link generated.',
    resetUrl,
    resetToken,
  })
})

const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires')

  if (!user) return res.status(400).json({ message: 'Token is invalid or has expired' })

  const { password, confirmPassword } = req.body
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' })
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' })
  }

  user.password = password
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  await user.save()

  return res.status(200).json({
    message: 'Password reset successful',
    token: generateToken(user._id),
    user: user.toSafeObject(),
  })
})

const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body
  const user = await User.findById(req.user._id).select('+password')
  const isMatch = await user.comparePassword(password)
  if (!isMatch) return res.status(401).json({ message: 'Password is incorrect' })

  await User.findByIdAndDelete(req.user._id)
  return res.status(200).json({ message: 'Account deleted successfully' })
})

// ─── Addresses ───────────────────────────────────────────────────────────────

const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  return res.status(200).json({ addresses: user.addresses })
})

const addAddress = asyncHandler(async (req, res) => {
  const { label, fullName, phone, addressLine, city, state, pincode, isDefault } = req.body
  const user = await User.findById(req.user._id)

  if (isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false })
  }

  user.addresses.push({ label, fullName, phone, addressLine, city, state, pincode, isDefault: Boolean(isDefault) })
  await user.save()

  return res.status(201).json({ message: 'Address added', addresses: user.addresses })
})

const updateAddress = asyncHandler(async (req, res) => {
  const { label, fullName, phone, addressLine, city, state, pincode, isDefault } = req.body
  const user = await User.findById(req.user._id)
  const address = user.addresses.id(req.params.addressId)
  if (!address) return res.status(404).json({ message: 'Address not found' })

  if (isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false })
  }

  if (label !== undefined) address.label = label
  if (fullName !== undefined) address.fullName = fullName
  if (phone !== undefined) address.phone = phone
  if (addressLine !== undefined) address.addressLine = addressLine
  if (city !== undefined) address.city = city
  if (state !== undefined) address.state = state
  if (pincode !== undefined) address.pincode = pincode
  if (isDefault !== undefined) address.isDefault = Boolean(isDefault)

  await user.save()
  return res.status(200).json({ message: 'Address updated', addresses: user.addresses })
})

const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  const address = user.addresses.id(req.params.addressId)
  if (!address) return res.status(404).json({ message: 'Address not found' })

  address.deleteOne()
  await user.save()
  return res.status(200).json({ message: 'Address deleted', addresses: user.addresses })
})

// ─── Wallet ───────────────────────────────────────────────────────────────────

const getWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  return res.status(200).json({
    balance: user.wallet.balance,
    transactions: user.wallet.transactions.slice().reverse().slice(0, 50),
  })
})

const addWalletMoney = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount)
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' })
  if (amount > 50000) return res.status(400).json({ message: 'Maximum top-up is ₹50,000' })

  const user = await User.findById(req.user._id)
  user.wallet.balance += amount
  user.wallet.transactions.push({ type: 'credit', amount, description: 'Wallet top-up' })
  await user.save()

  return res.status(200).json({ message: 'Wallet topped up', balance: user.wallet.balance })
})

// ─── Admin user management ────────────────────────────────────────────────────

const getAllUsers = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.role) filter.role = req.query.role
  const users = await User.find(filter).sort({ createdAt: -1 })
  return res.status(200).json({ users: users.map((u) => ({ ...u.toSafeObject(), isBlocked: u.isBlocked, createdAt: u.createdAt })) })
})

const toggleBlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  if (user.role === 'admin') return res.status(400).json({ message: 'Cannot block an admin account' })
  user.isBlocked = !user.isBlocked
  await user.save()
  return res.status(200).json({ message: user.isBlocked ? 'User blocked' : 'User unblocked', user: { ...user.toSafeObject(), isBlocked: user.isBlocked } })
})

const updateUser = asyncHandler(async (req, res) => {
  const { username, email, phone, vehicleNumber } = req.body
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ message: 'User not found' })

  if (email && email !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } })
    if (existing) return res.status(409).json({ message: 'Email already in use' })
    user.email = email.toLowerCase()
  }

  if (phone && phone !== user.phone) {
    const existing = await User.findOne({ phone, _id: { $ne: user._id } })
    if (existing) return res.status(409).json({ message: 'Phone already in use' })
    user.phone = phone
  }

  if (username) user.username = username
  if (vehicleNumber !== undefined) user.vehicleNumber = vehicleNumber

  await user.save()
  return res.status(200).json({ message: 'User updated successfully', user: { ...user.toSafeObject(), isBlocked: user.isBlocked } })
})

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete an admin account' })
  await User.findByIdAndDelete(req.params.id)
  return res.status(200).json({ message: 'User deleted successfully' })
})

module.exports = {
  signup,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getWallet,
  addWalletMoney,
  getAllUsers,
  toggleBlockUser,
  updateUser,
  deleteUser,
}
