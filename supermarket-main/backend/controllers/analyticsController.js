const Order = require('../models/Order')
const User = require('../models/User')
const Product = require('../models/Product')
const asyncHandler = require('../utils/asyncHandler')

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date()

  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    userStats,
    allOrderStats,
    todayOrderStats,
    monthOrderStats,
    monthlySalesRaw,
    dailySalesRaw,
    topProductsRaw,
    categoryPerformanceRaw,
    orderStatusBreakdownRaw,
    lowStockProducts,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { orderStatus: { $nin: ['cancelled', 'failed_delivery'] } } },
      { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, orderStatus: { $nin: ['cancelled', 'failed_delivery'] } } },
      { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: monthStart }, orderStatus: { $nin: ['cancelled', 'failed_delivery'] } } },
      { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, orderStatus: { $nin: ['cancelled', 'failed_delivery'] } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, orderStatus: { $nin: ['cancelled', 'failed_delivery'] } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
    Order.aggregate([
      { $match: { orderStatus: { $nin: ['cancelled', 'failed_delivery'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', name: { $first: '$items.name' }, thumbnail: { $first: '$items.thumbnail' }, totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: { orderStatus: { $nin: ['cancelled', 'failed_delivery'] } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'product.categoryId', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$category._id', name: { $first: { $ifNull: ['$category.name', 'Uncategorized'] } }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
    Product.find({ $or: [{ stock: 0 }, { $expr: { $lte: ['$stock', '$lowStockThreshold'] } }], isActive: true })
      .select('name stock lowStockThreshold sku thumbnail')
      .limit(10),
  ])

  const userMap = {}
  userStats.forEach((u) => { userMap[u._id] = u.count })

  const allOrders = allOrderStats[0] || { total: 0, revenue: 0 }
  const todayOrders = todayOrderStats[0] || { total: 0, revenue: 0 }
  const monthOrders = monthOrderStats[0] || { total: 0, revenue: 0 }

  const monthlySales = monthlySalesRaw.map((m) => ({
    label: `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`,
    shortLabel: MONTH_NAMES[m._id.month - 1],
    revenue: Math.round(m.revenue),
    orders: m.orders,
  }))

  const dailySales = dailySalesRaw.map((d) => ({
    label: `${d._id.day} ${MONTH_NAMES[d._id.month - 1]}`,
    shortLabel: `${d._id.day}/${d._id.month}`,
    revenue: Math.round(d.revenue),
    orders: d.orders,
  }))

  const statusMap = {}
  orderStatusBreakdownRaw.forEach((s) => { statusMap[s._id] = s.count })

  const conversionRate = (userMap.user || 0) > 0
    ? ((allOrders.total / (userMap.user || 1)) * 100).toFixed(1)
    : '0.0'

  return res.status(200).json({
    totals: {
      users: Object.values(userMap).reduce((a, b) => a + b, 0),
      customers: userMap.user || 0,
      deliveryPartners: userMap.delivery || 0,
      admins: userMap.admin || 0,
      orders: allOrders.total,
      revenue: Math.round(allOrders.revenue),
      todayRevenue: Math.round(todayOrders.revenue),
      todayOrders: todayOrders.total,
      monthRevenue: Math.round(monthOrders.revenue),
      monthOrders: monthOrders.total,
      avgOrderValue: allOrders.total > 0 ? Math.round(allOrders.revenue / allOrders.total) : 0,
      conversionRate,
    },
    monthlySales,
    dailySales,
    topProducts: topProductsRaw.map((p) => ({
      id: p._id,
      name: p.name,
      thumbnail: p.thumbnail,
      totalSold: p.totalSold,
      revenue: Math.round(p.revenue),
    })),
    categoryPerformance: categoryPerformanceRaw.map((c) => ({
      id: c._id,
      name: c.name,
      revenue: Math.round(c.revenue),
      orders: c.orders,
    })),
    orderStatusBreakdown: statusMap,
    lowStockProducts: lowStockProducts.map((p) => ({
      id: p._id,
      name: p.name,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      sku: p.sku,
      thumbnail: p.thumbnail,
    })),
  })
})

module.exports = { getDashboardStats }
