const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const API_PATHS = {
  auth: {
    login: '/api/auth/login',
    signup: '/api/auth/signup',
    users: '/api/auth/users',
    me: '/api/auth/me',
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
    myOrders: '/api/orders/my-orders',
    deliveryOrders: '/api/orders/delivery-orders',
    getById: '/api/orders/:id',
    all: '/api/orders',
    assign: '/api/orders/:id/assign',
    updateStatus: '/api/orders/:id/status',
    rejectDelivery: '/api/orders/:id/reject-delivery',
    proof: '/api/orders/:id/proof',
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
}

function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`
}

export { API_BASE_URL, API_PATHS, buildApiUrl }
