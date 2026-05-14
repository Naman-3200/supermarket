import { useEffect, useState } from 'react'
import { FileText, DownloadSimple } from '@phosphor-icons/react'
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function downloadCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '').replace(/"/g, '""')
    return /[",\n]/.test(s) ? `"${s}"` : s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ReportCard({ title, description, icon: Icon, color, onGenerate, loading }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
        ) : (
          <DownloadSimple size={15} weight="bold" />
        )}
        {loading ? 'Generating…' : 'Download CSV'}
      </button>
    </div>
  )
}

function AdminReports() {
  const [loadingReport, setLoadingReport] = useState('')
  const token = localStorage.getItem('authToken')

  const fetchAll = async () => {
    const [ordersRes, usersRes, productsRes] = await Promise.all([
      fetch(buildApiUrl(API_PATHS.orders.all), { headers: { Authorization: `Bearer ${token}` } }),
      fetch(buildApiUrl(API_PATHS.auth.users), { headers: { Authorization: `Bearer ${token}` } }),
      fetch(buildApiUrl(API_PATHS.products.list)),
    ])
    const [ordersData, usersData, productsData] = await Promise.all([ordersRes.json(), usersRes.json(), productsRes.json()])
    return {
      orders: ordersData.orders || [],
      users: usersData.users || [],
      products: productsData.products || [],
    }
  }

  const generateSalesReport = async () => {
    setLoadingReport('sales')
    try {
      const { orders } = await fetchAll()
      const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'City', 'State', 'Items', 'Total Amount (₹)', 'Payment Method', 'Payment Status', 'Order Status']
      const rows = orders.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleDateString('en-IN'),
        o.deliveryAddress?.fullName,
        o.deliveryAddress?.phone,
        o.deliveryAddress?.city,
        o.deliveryAddress?.state,
        o.items?.length,
        Number(o.totalAmount).toFixed(2),
        o.paymentMethod,
        o.paymentStatus,
        o.orderStatus,
      ])
      downloadCSV(`sales-report-${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
    } catch (_) {}
    setLoadingReport('')
  }

  const generateProductReport = async () => {
    setLoadingReport('products')
    try {
      const { products, orders } = await fetchAll()
      const salesMap = {}
      orders.filter((o) => !['cancelled', 'failed_delivery'].includes(o.orderStatus)).forEach((o) => {
        o.items?.forEach((item) => {
          const id = String(item.productId)
          if (!salesMap[id]) salesMap[id] = { qty: 0, revenue: 0 }
          salesMap[id].qty += item.quantity
          salesMap[id].revenue += item.price * item.quantity
        })
      })
      const headers = ['Product Name', 'SKU', 'Category', 'Price (₹)', 'Discount (%)', 'Stock', 'Status', 'Units Sold', 'Revenue (₹)']
      const rows = products.map((p) => {
        const s = salesMap[String(p._id)] || { qty: 0, revenue: 0 }
        return [
          p.name, p.sku || '', p.categoryId?.name || '', Number(p.price).toFixed(2), p.discount || 0,
          p.stock ?? 0, p.isActive ? 'Active' : 'Inactive', s.qty, s.revenue.toFixed(2),
        ]
      })
      downloadCSV(`product-report-${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
    } catch (_) {}
    setLoadingReport('')
  }

  const generateCustomerReport = async () => {
    setLoadingReport('customers')
    try {
      const { users, orders } = await fetchAll()
      const orderMap = {}
      orders.forEach((o) => {
        const uid = String(o.userId?._id || o.userId)
        if (!orderMap[uid]) orderMap[uid] = { count: 0, revenue: 0 }
        if (!['cancelled', 'failed_delivery'].includes(o.orderStatus)) {
          orderMap[uid].count += 1
          orderMap[uid].revenue += o.totalAmount
        }
      })
      const customers = users.filter((u) => u.role === 'user')
      const headers = ['Name', 'Email', 'Phone', 'Status', 'Joined', 'Total Orders', 'Total Spent (₹)']
      const rows = customers.map((u) => {
        const om = orderMap[String(u.id)] || { count: 0, revenue: 0 }
        return [
          u.username, u.email, u.phone || '',
          u.isBlocked ? 'Blocked' : 'Active',
          new Date(u.createdAt).toLocaleDateString('en-IN'),
          om.count, om.revenue.toFixed(2),
        ]
      })
      downloadCSV(`customer-report-${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
    } catch (_) {}
    setLoadingReport('')
  }

  const generateDeliveryReport = async () => {
    setLoadingReport('delivery')
    try {
      const { users, orders } = await fetchAll()
      const deliveryMap = {}
      orders.forEach((o) => {
        if (!o.assignedDeliveryPartner) return
        const pid = String(o.assignedDeliveryPartner._id || o.assignedDeliveryPartner)
        if (!deliveryMap[pid]) deliveryMap[pid] = { total: 0, delivered: 0, active: 0, revenue: 0 }
        deliveryMap[pid].total += 1
        if (o.orderStatus === 'delivered') { deliveryMap[pid].delivered += 1; deliveryMap[pid].revenue += o.totalAmount }
        if (['confirmed', 'processing', 'shipped'].includes(o.orderStatus)) deliveryMap[pid].active += 1
      })
      const partners = users.filter((u) => u.role === 'delivery')
      const headers = ['Name', 'Email', 'Phone', 'Vehicle Number', 'Status', 'Total Assigned', 'Delivered', 'Active', 'Revenue Delivered (₹)']
      const rows = partners.map((p) => {
        const dm = deliveryMap[String(p.id)] || { total: 0, delivered: 0, active: 0, revenue: 0 }
        return [
          p.username, p.email, p.phone || '', p.vehicleNumber || '',
          p.isBlocked ? 'Suspended' : 'Active',
          dm.total, dm.delivered, dm.active, dm.revenue.toFixed(2),
        ]
      })
      downloadCSV(`delivery-report-${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
    } catch (_) {}
    setLoadingReport('')
  }

  const generateInventoryReport = async () => {
    setLoadingReport('inventory')
    try {
      const { products } = await fetchAll()
      const headers = ['Product Name', 'SKU', 'Category', 'Price (₹)', 'Stock Qty', 'Low Stock Alert', 'Stock Value (₹)', 'Status', 'Stock Status']
      const rows = products.map((p) => {
        const isOut = (p.stock ?? 0) === 0
        const isLow = !isOut && (p.stock ?? 0) <= (p.lowStockThreshold ?? 10)
        return [
          p.name, p.sku || '', p.categoryId?.name || '', Number(p.price).toFixed(2),
          p.stock ?? 0, p.lowStockThreshold ?? 10,
          ((p.stock ?? 0) * (p.price ?? 0)).toFixed(2),
          p.isActive ? 'Active' : 'Inactive',
          isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock',
        ]
      })
      downloadCSV(`inventory-report-${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
    } catch (_) {}
    setLoadingReport('')
  }

  const generateTaxReport = async () => {
    setLoadingReport('tax')
    try {
      const { orders } = await fetchAll()
      const delivered = orders.filter((o) => o.orderStatus === 'delivered')
      const headers = ['Order Number', 'Date', 'Customer Name', 'Total Amount (₹)', 'GST Base (₹)', 'GST 5% (₹)', 'Payment Method']
      const rows = delivered.map((o) => {
        const base = o.totalAmount / 1.05
        const gst = o.totalAmount - base
        return [
          o.orderNumber,
          new Date(o.createdAt).toLocaleDateString('en-IN'),
          o.deliveryAddress?.fullName,
          Number(o.totalAmount).toFixed(2),
          base.toFixed(2),
          gst.toFixed(2),
          o.paymentMethod,
        ]
      })
      downloadCSV(`tax-report-${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
    } catch (_) {}
    setLoadingReport('')
  }

  const reports = [
    {
      key: 'sales',
      title: 'Sales Report',
      description: 'All orders with dates, amounts, customer info, payment and order status.',
      icon: FileText,
      color: 'bg-emerald-50 text-emerald-600',
      onGenerate: generateSalesReport,
    },
    {
      key: 'products',
      title: 'Product Report',
      description: 'Product catalog with pricing, stock levels, and sales performance.',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
      onGenerate: generateProductReport,
    },
    {
      key: 'inventory',
      title: 'Inventory Report',
      description: 'Current stock levels, stock values, and low stock / out-of-stock status.',
      icon: FileText,
      color: 'bg-amber-50 text-amber-600',
      onGenerate: generateInventoryReport,
    },
    {
      key: 'customers',
      title: 'Customer Report',
      description: 'Registered customers with order count, total spend, and account status.',
      icon: FileText,
      color: 'bg-violet-50 text-violet-600',
      onGenerate: generateCustomerReport,
    },
    {
      key: 'delivery',
      title: 'Delivery Report',
      description: 'Delivery partner performance including assigned, completed, and active deliveries.',
      icon: FileText,
      color: 'bg-rose-50 text-rose-600',
      onGenerate: generateDeliveryReport,
    },
    {
      key: 'tax',
      title: 'Tax Report',
      description: 'GST calculation for all delivered orders (5% GST assumed on total amount).',
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-600',
      onGenerate: generateTaxReport,
    },
  ]

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Analytics</p>
        <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Reports</h2>
        <p className="mt-0.5 text-sm text-gray-500">Generate and download CSV reports for your records.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <ReportCard
            key={r.key}
            title={r.title}
            description={r.description}
            icon={r.icon}
            color={r.color}
            loading={loadingReport === r.key}
            onGenerate={r.onGenerate}
          />
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
        <p className="font-semibold text-gray-700 mb-1">Notes</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Reports are generated from live data and downloaded instantly as CSV files.</li>
          <li>Sales and product reports exclude cancelled orders in revenue calculations.</li>
          <li>Tax report assumes 5% GST inclusive pricing. Adjust as per your tax configuration.</li>
          <li>Razorpay integration is pending — online payment data will be enriched once configured.</li>
        </ul>
      </div>
    </section>
  )
}

export default AdminReports
