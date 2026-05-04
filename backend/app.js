const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const authRoutes = require('./routes/authRoutes')
const healthRoutes = require('./routes/healthRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const subCategoryRoutes = require('./routes/subCategoryRoutes')
const productRoutes = require('./routes/productRoutes')
const uploadRoutes = require('./routes/uploadRoutes')
const orderRoutes = require('./routes/orderRoutes')
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler')

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*',
    credentials: true,
  }),
)
app.use(express.json({ limit: '10kb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/health', healthRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/subcategories', subCategoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/orders', orderRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
