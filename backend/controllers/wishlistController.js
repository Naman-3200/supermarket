const Wishlist = require('../models/Wishlist')
const asyncHandler = require('../utils/asyncHandler')

const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ userId: req.user._id })
    .populate('items.productId', 'name price thumbnail unit isActive discount images')

  if (!wishlist) return res.json({ items: [] })

  const items = wishlist.items
    .filter((i) => i.productId)
    .map((i) => ({ _id: i._id, addedAt: i.createdAt, product: i.productId }))

  res.json({ items })
})

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body
  if (!productId) return res.status(400).json({ message: 'Product ID is required' })

  let wishlist = await Wishlist.findOne({ userId: req.user._id })

  if (!wishlist) {
    wishlist = await Wishlist.create({ userId: req.user._id, items: [{ productId }] })
    return res.status(201).json({ message: 'Added to wishlist', count: 1 })
  }

  const alreadyExists = wishlist.items.some((i) => String(i.productId) === String(productId))
  if (alreadyExists) return res.status(409).json({ message: 'Product already in wishlist' })

  wishlist.items.push({ productId })
  await wishlist.save()

  res.status(201).json({ message: 'Added to wishlist', count: wishlist.items.length })
})

const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ userId: req.user._id })
  if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' })

  wishlist.items = wishlist.items.filter((i) => String(i.productId) !== String(req.params.productId))
  await wishlist.save()

  res.json({ message: 'Removed from wishlist', count: wishlist.items.length })
})

const getWishlistCount = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ userId: req.user._id })
  res.json({ count: wishlist ? wishlist.items.length : 0 })
})

module.exports = { getWishlist, addToWishlist, removeFromWishlist, getWishlistCount }
