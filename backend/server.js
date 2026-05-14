const dotenv = require('dotenv')

dotenv.config()

const app = require('./app')
const connectDatabase = require('./config/database')

const PORT = process.env.PORT || 5000

const startServer = async () => {
	try {
		if (!process.env.JWT_SECRET) {
			throw new Error('JWT_SECRET is not set in environment variables')
		}

		if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
			throw new Error('Cloudinary credentials are missing in environment variables')
		}

		await connectDatabase()

		app.listen(PORT, () => {
			console.log(`Server running on http://localhost:${PORT}`)
		})
	} catch (error) {
		console.error('Failed to start server:', error.message)
		process.exit(1)
	}
}

startServer()
