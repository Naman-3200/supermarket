const SubCategory = require('../models/SubCategory')
const Category = require('../models/Category')
const asyncHandler = require('../utils/asyncHandler')

const createSubCategory = asyncHandler(async (req, res) => {
  const { name, description, categoryId, image } = req.body

  if (!name || !categoryId) {
    return res.status(400).json({ message: 'SubCategory name and category ID are required' })
  }

  const categoryExists = await Category.findById(categoryId)

  if (!categoryExists) {
    return res.status(404).json({ message: 'Category not found' })
  }

  const existingSubCategory = await SubCategory.findOne({
    name: name.toLowerCase().trim(),
    categoryId,
  })

  if (existingSubCategory) {
    return res.status(409).json({ message: 'SubCategory already exists in this category' })
  }

  const subCategory = await SubCategory.create({
    name: name.trim(),
    description: description || '',
    categoryId,
    image: String(image || '').trim(),
  })

  return res.status(201).json({
    message: 'SubCategory created successfully',
    subCategory,
  })
})

const getSubCategoriesByCategoryId = asyncHandler(async (req, res) => {
  const { categoryId } = req.params
  const subCategories = await SubCategory.find({ categoryId, isActive: true }).sort({ createdAt: -1 })

  return res.status(200).json({
    subCategories,
  })
})

const getAllSubCategories = asyncHandler(async (req, res) => {
  const subCategories = await SubCategory.find({ isActive: true })
    .populate('categoryId', 'name')
    .sort({ createdAt: -1 })

  return res.status(200).json({
    subCategories,
  })
})

const updateSubCategory = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, description, image, isActive } = req.body

  const subCategory = await SubCategory.findByIdAndUpdate(
    id,
    {
      name: name || undefined,
      description: description || undefined,
      image: image || undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    },
    { new: true, runValidators: true },
  )

  if (!subCategory) {
    return res.status(404).json({ message: 'SubCategory not found' })
  }

  return res.status(200).json({
    message: 'SubCategory updated successfully',
    subCategory,
  })
})

const deleteSubCategory = asyncHandler(async (req, res) => {
  const { id } = req.params

  const subCategory = await SubCategory.findByIdAndDelete(id)

  if (!subCategory) {
    return res.status(404).json({ message: 'SubCategory not found' })
  }

  return res.status(200).json({
    message: 'SubCategory deleted successfully',
  })
})

module.exports = {
  createSubCategory,
  getSubCategoriesByCategoryId,
  getAllSubCategories,
  updateSubCategory,
  deleteSubCategory,
}
