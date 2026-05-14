import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AdminDashboard from './component/admin/AdminDashboard'
import LoginPage from './component/auth/LoginPage'
import SignupPage from './component/auth/SignupPage'
import ForgotPasswordPage from './component/auth/ForgotPasswordPage'
import ResetPasswordPage from './component/auth/ResetPasswordPage'
import DeliveryDashboard from './component/delivery/DeliveryDashboard'
import LandingPage from './component/landing/LandingPage'
import CategoriesPage from './component/landing/CategoriesPage'
import CategoryDetailsPage from './component/landing/CategoryDetailsPage'
import CartPage from './component/landing/CartPage'
import ProductsPage from './component/landing/ProductsPage'
import ProductDetailsPage from './component/landing/ProductDetailsPage'
import WishlistPage from './component/landing/WishlistPage'
import CheckoutPage from './component/landing/CheckoutPage'
import OrderSuccessPage from './component/landing/OrderSuccessPage'
import OrdersPage from './component/landing/OrdersPage'
import OrderDetailsPage from './component/landing/OrderDetailsPage'
import ProfilePage from './component/landing/ProfilePage'
import SearchPage from './component/landing/SearchPage'
import SupportPage from './component/landing/SupportPage'
import SupportTicketPage from './component/landing/SupportTicketPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/:categoryId" element={<CategoryDetailsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:productId" element={<ProductDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/support/:ticketId" element={<SupportTicketPage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Admin & Delivery */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
