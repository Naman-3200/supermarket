const Coupon = require('../models/Coupon')
const asyncHandler = require('../utils/asyncHandler')

const getAllCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().populate('categoryId', 'name').sort({ createdAt: -1 })
  return res.status(200).json({ coupons })
})

const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).populate('categoryId', 'name')
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' })
  return res.status(200).json({ coupon })
})

const createCoupon = asyncHandler(async (req, res) => {
  const { code, type, value, description, minOrderAmount, maxDiscount, categoryId, isActive, expiryDate, usageLimit } = req.body

  if (!code || !type || value === undefined) {
    return res.status(400).json({ message: 'Code, type and value are required' })
  }

  const existing = await Coupon.findOne({ code: code.toUpperCase() })
  if (existing) return res.status(409).json({ message: 'Coupon code already exists' })

  const coupon = await Coupon.create({
    code: code.toUpperCase().trim(),
    type,
    value,
    description: description || '',
    minOrderAmount: minOrderAmount || 0,
    maxDiscount: maxDiscount || null,
    categoryId: categoryId || null,
    isActive: isActive !== undefined ? isActive : true,
    expiryDate: expiryDate || null,
    usageLimit: usageLimit || null,
  })

  return res.status(201).json({ message: 'Coupon created successfully', coupon })
})

const updateCoupon = asyncHandler(async (req, res) => {
  const { code, type, value, description, minOrderAmount, maxDiscount, categoryId, isActive, expiryDate, usageLimit } = req.body

  if (code) {
    const existing = await Coupon.findOne({ code: code.toUpperCase(), _id: { $ne: req.params.id } })
    if (existing) return res.status(409).json({ message: 'Coupon code already in use' })
  }

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    {
      code: code ? code.toUpperCase().trim() : undefined,
      type: type || undefined,
      value: value !== undefined ? value : undefined,
      description: description !== undefined ? description : undefined,
      minOrderAmount: minOrderAmount !== undefined ? minOrderAmount : undefined,
      maxDiscount: maxDiscount !== undefined ? maxDiscount : undefined,
      categoryId: categoryId !== undefined ? (categoryId || null) : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
      expiryDate: expiryDate !== undefined ? (expiryDate || null) : undefined,
      usageLimit: usageLimit !== undefined ? (usageLimit || null) : undefined,
    },
    { new: true, runValidators: true },
  )

  if (!coupon) return res.status(404).json({ message: 'Coupon not found' })
  return res.status(200).json({ message: 'Coupon updated successfully', coupon })
})

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id)
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' })
  return res.status(200).json({ message: 'Coupon deleted successfully' })
})

const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderAmount, categoryId } = req.body

  const coupon = await Coupon.findOne({ code: code?.toUpperCase(), isActive: true })
  if (!coupon) return res.status(404).json({ message: 'Invalid or inactive coupon code' })

  if (coupon.expiryDate && new Date() > coupon.expiryDate) {
    return res.status(400).json({ message: 'This coupon has expired' })
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ message: 'This coupon has reached its usage limit' })
  }

  if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
    return res.status(400).json({ message: `Minimum order amount of ₹${coupon.minOrderAmount} required` })
  }

  if (coupon.categoryId && String(coupon.categoryId) !== String(categoryId)) {
    return res.status(400).json({ message: 'This coupon is not valid for the selected category' })
  }

  let discountAmount = 0
  if (coupon.type === 'percentage') {
    discountAmount = (orderAmount * coupon.value) / 100
    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount)
  } else if (coupon.type === 'fixed') {
    discountAmount = Math.min(coupon.value, orderAmount)
  }

  return res.status(200).json({
    valid: true,
    coupon: { code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description },
    discountAmount: Math.round(discountAmount),
    freeDelivery: coupon.type === 'free_delivery',
  })
})

module.exports = { getAllCoupons, getCouponById, createCoupon, updateCoupon, deleteCoupon, validateCoupon }
