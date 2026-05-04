const cloudinary = require('../config/cloudinary')

function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploader = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error)
        return
      }

      resolve(result)
    })

    uploader.end(buffer)
  })
}

module.exports = uploadToCloudinary
