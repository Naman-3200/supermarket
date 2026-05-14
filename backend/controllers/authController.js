const User = require('../models/User')
const asyncHandler = require('../utils/asyncHandler')
const generateToken = require('../utils/generateToken')

const signup = asyncHandler(async (req, res) => {
  const { username, email, phone, password, confirmPassword, role, vehicleNumber } = req.body
  const normalizedRole = role === 'delivery' ? 'delivery' : 'user'
  const normalizedVehicleNumber = String(vehicleNumber || '').trim()

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Password and confirm password do not match' })
  }

  if (normalizedRole === 'delivery' && !normalizedVehicleNumber) {
    return res.status(400).json({ message: 'Vehicle number is required for delivery account' })
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { phone }],
  })

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
    vehicleNumber: normalizedRole === 'delivery' ? normalizedVehicleNumber : '',
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

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) {
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
  return res.status(200).json({ user: req.user.toSafeObject() })
})

const getAllUsers = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.role) filter.role = req.query.role

  const users = await User.find(filter).sort({ createdAt: -1 })

  return res.status(200).json({
    users: users.map((user) => ({
      ...user.toSafeObject(),
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    })),
  })
})

const toggleBlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  if (user.role === 'admin') return res.status(400).json({ message: 'Cannot block an admin account' })

  user.isBlocked = !user.isBlocked
  await user.save()

  return res.status(200).json({
    message: user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
    user: { ...user.toSafeObject(), isBlocked: user.isBlocked },
  })
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

  return res.status(200).json({
    message: 'User updated successfully',
    user: { ...user.toSafeObject(), isBlocked: user.isBlocked },
  })
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
  getAllUsers,
  toggleBlockUser,
  updateUser,
  deleteUser,
}
