const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
)

const walletTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: '' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  },
  { timestamps: true },
)

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    role: { type: String, enum: ['user', 'admin', 'delivery'], default: 'user', required: true },
    vehicleNumber: { type: String, trim: true, maxlength: 30, default: '' },
    isBlocked: { type: Boolean, default: false },
    deliveryStatus: { type: String, enum: ['offline', 'online', 'break'], default: 'offline' },
    shiftStart: { type: String, default: '' },
    shiftEnd: { type: String, default: '' },
    password: { type: String, required: true, minlength: 6, select: false },
    avatar: { type: String, default: '' },
    addresses: { type: [addressSchema], default: [] },
    wallet: {
      balance: { type: Number, default: 0, min: 0 },
      transactions: { type: [walletTransactionSchema], default: [] },
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
  this.resetPasswordExpires = Date.now() + 30 * 60 * 1000 // 30 minutes
  return resetToken
}

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    phone: this.phone,
    role: this.role,
    vehicleNumber: this.vehicleNumber,
    isBlocked: this.isBlocked,
    deliveryStatus: this.deliveryStatus,
    shiftStart: this.shiftStart,
    shiftEnd: this.shiftEnd,
    avatar: this.avatar,
    addresses: this.addresses,
    wallet: { balance: this.wallet?.balance || 0 },
    createdAt: this.createdAt,
  }
}

module.exports = mongoose.model('User', userSchema)
