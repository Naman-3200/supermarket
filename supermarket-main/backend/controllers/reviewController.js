const Review = require('../models/Review')
const Product = require('../models/Product')
const asyncHandler = require('../utils/asyncHandler')

const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ productId: req.params.productId })
    .populate('userId', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(50)

  const avg = reviews.length
    ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
    : 0

  res.json({ reviews, averageRating: avg, totalReviews: reviews.length })
})

const addReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, comment, deliveryRating } = req.body

  if (!productId) return res.status(400).json({ message: 'Product ID is required' })
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' })

  const existing = await Review.findOne({ productId, userId: req.user._id })
  if (existing) return res.status(409).json({ message: 'You have already reviewed this product' })

  const review = await Review.create({
    productId,
    userId: req.user._id,
    orderId: orderId || null,
    rating: Number(rating),
    comment: comment || '',
    deliveryRating: deliveryRating ? Number(deliveryRating) : null,
  })

  await review.populate('userId', 'username avatar')
  res.status(201).json({ message: 'Review submitted', review })
})

const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment, deliveryRating } = req.body
  const review = await Review.findOne({ _id: req.params.id, userId: req.user._id })
  if (!review) return res.status(404).json({ message: 'Review not found' })

  if (rating !== undefined) review.rating = Number(rating)
  if (comment !== undefined) review.comment = comment
  if (deliveryRating !== undefined) review.deliveryRating = deliveryRating ? Number(deliveryRating) : null

  await review.save()
  await review.populate('userId', 'username avatar')
  res.json({ message: 'Review updated', review })
})

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, userId: req.user._id })
  if (!review) return res.status(404).json({ message: 'Review not found' })
  await Review.findByIdAndDelete(req.params.id)
  res.json({ message: 'Review deleted' })
})

const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ userId: req.user._id })
    .populate('productId', 'name thumbnail')
    .sort({ createdAt: -1 })
  res.json({ reviews })
})

module.exports = { getProductReviews, addReview, updateReview, deleteReview, getMyReviews }
