const asyncHandler = require('../utils/asyncHandler')
const uploadToCloudinary = require('../utils/uploadToCloudinary')

const uploadImages = asyncHandler(async (req, res) => {
  const files = req.files || []

  if (!files.length) {
    return res.status(400).json({ message: 'At least one image file is required' })
  }

  const folder = req.body.folder || 'supermarket'

  const uploadedImages = await Promise.all(
    files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, {
        folder,
        resource_type: 'image',
      })

      return {
        url: result.secure_url,
        publicId: result.public_id,
      }
    }),
  )

  return res.status(200).json({
    images: uploadedImages,
  })
})

module.exports = {
  uploadImages,
}
