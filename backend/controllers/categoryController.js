const Category = require('../models/Category')
const asyncHandler = require('../utils/asyncHandler')

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body

  if (!name || !image) {
    return res.status(400).json({ message: 'Category name and image are required' })
  }

  const existingCategory = await Category.findOne({ name: name.toLowerCase().trim() })

  if (existingCategory) {
    return res.status(409).json({ message: 'Category already exists' })
  }

  const category = await Category.create({
    name: name.trim(),
    description: description || '',
    image: image.trim(),
  })

  return res.status(201).json({
    message: 'Category created successfully',
    category,
  })
})

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ createdAt: -1 })

  return res.status(200).json({
    categories,
  })
})

const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params
  const category = await Category.findById(id)

  if (!category) {
    return res.status(404).json({ message: 'Category not found' })
  }

  return res.status(200).json({
    category,
  })
})

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, description, image, isActive } = req.body

  const category = await Category.findByIdAndUpdate(
    id,
    {
      name: name || undefined,
      description: description || undefined,
      image: image || undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    },
    { new: true, runValidators: true },
  )

  if (!category) {
    return res.status(404).json({ message: 'Category not found' })
  }

  return res.status(200).json({
    message: 'Category updated successfully',
    category,
  })
})

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params

  const category = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true })

  if (!category) {
    return res.status(404).json({ message: 'Category not found' })
  }

  return res.status(200).json({
    message: 'Category deleted successfully',
  })
})

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
}
