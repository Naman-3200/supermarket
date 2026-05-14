import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AdminDashboard from './component/admin/AdminDashboard'
import LoginPage from './component/auth/LoginPage'
import SignupPage from './component/auth/SignupPage'
import DeliveryDashboard from './component/delivery/DeliveryDashboard'
import LandingPage from './component/landing/LandingPage'
import CategoriesPage from './component/landing/CategoriesPage'
import CategoryDetailsPage from './component/landing/CategoryDetailsPage'
import CartPage from './component/landing/CartPage'
import ProductsPage from './component/landing/ProductsPage'
import ProductDetailsPage from './component/landing/ProductDetailsPage'
import WaitlistPage from './component/landing/WaitlistPage'
import CheckoutPage from './component/landing/CheckoutPage'
import OrderSuccessPage from './component/landing/OrderSuccessPage'
import OrdersPage from './component/landing/OrdersPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/:categoryId" element={<CategoryDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/waitlist" element={<WaitlistPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:productId" element={<ProductDetailsPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
