const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const API_PATHS = {
  auth: {
    login: '/api/auth/login',
    signup: '/api/auth/signup',
    me: '/api/auth/me',
    profile: '/api/auth/profile',
    changePassword: '/api/auth/change-password',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password/:token',
    deleteAccount: '/api/auth/delete-account',
    addresses: '/api/auth/addresses',
    addressById: '/api/auth/addresses/:addressId',
    wallet: '/api/auth/wallet',
    walletAdd: '/api/auth/wallet/add',
    users: '/api/auth/users',
    toggleBlock: '/api/auth/:id/toggle-block',
    update: '/api/auth/:id',
    delete: '/api/auth/:id',
  },
  health: '/api/health',
  analytics: {
    dashboard: '/api/analytics/dashboard',
  },
  categories: {
    list: '/api/categories',
    create: '/api/categories',
    getById: '/api/categories/:id',
    update: '/api/categories/:id',
    delete: '/api/categories/:id',
  },
  subCategories: {
    list: '/api/subcategories',
    create: '/api/subcategories',
    getByCategory: '/api/subcategories/category/:categoryId',
    update: '/api/subcategories/:id',
    delete: '/api/subcategories/:id',
  },
  products: {
    list: '/api/products',
    create: '/api/products',
    getById: '/api/products/:id',
    update: '/api/products/:id',
    delete: '/api/products/:id',
  },
  uploads: {
    images: '/api/uploads',
  },
  orders: {
    create: '/api/orders',
    razorpayOrder: '/api/orders/razorpay-order',
    myOrders: '/api/orders/my-orders',
    deliveryOrders: '/api/orders/delivery-orders',
    getById: '/api/orders/:id',
    all: '/api/orders',
    assign: '/api/orders/:id/assign',
    updateStatus: '/api/orders/:id/status',
    rejectDelivery: '/api/orders/:id/reject-delivery',
    proof: '/api/orders/:id/proof',
    cancel: '/api/orders/:id/cancel',
    return: '/api/orders/:id/return',
    invoice: '/api/orders/:id/invoice',
    reorder: '/api/orders/:id/reorder',
  },
  delivery: {
    analytics: '/api/delivery/analytics',
    availability: '/api/delivery/availability',
  },
  coupons: {
    list: '/api/coupons',
    create: '/api/coupons',
    getById: '/api/coupons/:id',
    update: '/api/coupons/:id',
    delete: '/api/coupons/:id',
    validate: '/api/coupons/validate',
  },
  reviews: {
    byProduct: '/api/reviews/product/:productId',
    myReviews: '/api/reviews/my-reviews',
    create: '/api/reviews',
    update: '/api/reviews/:id',
    delete: '/api/reviews/:id',
  },
  wishlist: {
    get: '/api/wishlist',
    count: '/api/wishlist/count',
    add: '/api/wishlist',
    remove: '/api/wishlist/:productId',
  },
  support: {
    myTickets: '/api/support/my-tickets',
    all: '/api/support/all',
    create: '/api/support',
    getById: '/api/support/:id',
    reply: '/api/support/:id/reply',
    updateStatus: '/api/support/:id/status',
  },
}

function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`
}

export { API_BASE_URL, API_PATHS, buildApiUrl }
