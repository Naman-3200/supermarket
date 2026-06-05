const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    thumbnail: { type: String, default: '' },
    unit: { type: String, default: '' },
  },
  { _id: false },
)

const deliveryAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const returnRequestSchema = new mongoose.Schema(
  {
    reason: { type: String, default: '' },
    requestedAt: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    resolvedAt: { type: Date },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, 'Order must have at least one item'],
    },
    deliveryAddress: { type: deliveryAddressSchema, required: true },
    paymentMethod: { type: String, enum: ['cod', 'online', 'wallet', 'razorpay'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    orderStatus: {
      type: String,
      enum: [
        'pending',
        'placed',
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'refunded',
        'failed_delivery',
      ],
      default: 'pending',
    },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    couponDiscount: { type: Number, default: 0 },
    walletAmountUsed: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    orderNotes: { type: String, default: '' },
    assignedDeliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deliveryProofImage: { type: String, default: '' },
    failureReason: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
    cancelledAt: { type: Date },
    returnRequest: { type: returnRequestSchema, default: null },
    refundAmount: { type: Number, default: 0 },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    deliveryOtp: { type: String, default: '' },
    deliveryOtpVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
)

orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`
  }
  next()
})

module.exports = mongoose.model('Order', orderSchema)
