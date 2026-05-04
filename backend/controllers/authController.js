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

  return res.status(200).json({
    message: 'Login successful',
    user: user.toSafeObject(),
    token: generateToken(user._id),
  })
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json({
    user: req.user.toSafeObject(),
  })
})

const getAllUsers = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.role) {
    filter.role = req.query.role
  }

  const users = await User.find(filter).sort({ createdAt: -1 })

  return res.status(200).json({
    users: users.map((user) => ({
      ...user.toSafeObject(),
      createdAt: user.createdAt,
    })),
  })
})

module.exports = {
  signup,
  login,
  getCurrentUser,
  getAllUsers,
}
