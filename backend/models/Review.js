const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
    deliveryRating: { type: Number, min: 1, max: 5, default: null },
    images: { type: [String], default: [] },
  },
  { timestamps: true },
)

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model('Review', reviewSchema)
