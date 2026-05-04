const Product = require('../models/Product')
const Category = require('../models/Category')
const SubCategory = require('../models/SubCategory')
const asyncHandler = require('../utils/asyncHandler')

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discount, unit, categoryId, subCategoryId, images, isActive } = req.body
  const normalizedSubCategoryId = String(subCategoryId || '').trim()

  if (!name || !price || !categoryId) {
    return res.status(400).json({ message: 'Product name, price, and category are required' })
  }

  if (!Array.isArray(images) || images.length < 1) {
    return res.status(400).json({ message: 'At least one product image is required' })
  }

  if (images.length > 5) {
    return res.status(400).json({ message: 'Maximum 5 product images are allowed' })
  }

  const categoryExists = await Category.findById(categoryId)

  if (!categoryExists) {
    return res.status(404).json({ message: 'Category not found' })
  }

  if (normalizedSubCategoryId) {
    const subCategoryExists = await SubCategory.findById(normalizedSubCategoryId)

    if (!subCategoryExists) {
      return res.status(404).json({ message: 'SubCategory not found' })
    }
  }

  const product = await Product.create({
    name: name.trim(),
    description: description || '',
    price,
    discount: discount || 0,
    unit: unit || 'kg',
    categoryId,
    subCategoryId: normalizedSubCategoryId || null,
    images,
    thumbnail: images[0],
    isActive: isActive !== undefined ? isActive : true,
  })

  return res.status(201).json({
    message: 'Product created successfully',
    product,
  })
})

const getAllProducts = asyncHandler(async (req, res) => {
  const { categoryId, subCategoryId } = req.query

  const filter = {}

  if (categoryId) {
    filter.categoryId = categoryId
  }

  if (subCategoryId) {
    filter.subCategoryId = subCategoryId
  }

  const products = await Product.find(filter)
    .populate('categoryId', 'name')
    .populate('subCategoryId', 'name')
    .sort({ createdAt: -1 })

  return res.status(200).json({
    products,
  })
})

const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params

  const product = await Product.findById(id)
    .populate('categoryId', 'name')
    .populate('subCategoryId', 'name')

  if (!product) {
    return res.status(404).json({ message: 'Product not found' })
  }

  return res.status(200).json({
    product,
  })
})

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, description, price, discount, unit, images, isActive, subCategoryId } = req.body
  const hasSubCategoryField = Object.prototype.hasOwnProperty.call(req.body, 'subCategoryId')
  const normalizedSubCategoryId = String(subCategoryId || '').trim()

  if (Array.isArray(images) && images.length > 5) {
    return res.status(400).json({ message: 'Maximum 5 product images are allowed' })
  }

  if (hasSubCategoryField && normalizedSubCategoryId) {
    const subCategoryExists = await SubCategory.findById(normalizedSubCategoryId)

    if (!subCategoryExists) {
      return res.status(404).json({ message: 'SubCategory not found' })
    }
  }

  const product = await Product.findByIdAndUpdate(
    id,
    {
      name: name || undefined,
      description: description || undefined,
      price: price || undefined,
      discount: discount !== undefined ? discount : undefined,
      unit: unit || undefined,
      subCategoryId: hasSubCategoryField ? (normalizedSubCategoryId || null) : undefined,
      images: Array.isArray(images) ? images : undefined,
      thumbnail: Array.isArray(images) && images.length ? images[0] : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    },
    { new: true, runValidators: true },
  )

  if (!product) {
    return res.status(404).json({ message: 'Product not found' })
  }

  return res.status(200).json({
    message: 'Product updated successfully',
    product,
  })
})

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params

  const product = await Product.findByIdAndDelete(id)

  if (!product) {
    return res.status(404).json({ message: 'Product not found' })
  }

  return res.status(200).json({
    message: 'Product deleted successfully',
  })
})

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
}
