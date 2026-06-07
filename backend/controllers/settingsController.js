const Settings = require('../models/Settings')
const asyncHandler = require('../utils/asyncHandler')

const DEFAULT_DELIVERY_CHARGE = 40
const DEFAULT_FREE_DELIVERY_THRESHOLD = 499
const DEFAULT_FREE_DELIVERY_ENABLED = true
const DEFAULT_BUSINESS_RADIUS = 10

const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.find({})
  const map = {}
  for (const s of settings) map[s.key] = s.value

  res.json({
    deliveryCharge: map.deliveryCharge ?? DEFAULT_DELIVERY_CHARGE,
    freeDeliveryThreshold: map.freeDeliveryThreshold ?? DEFAULT_FREE_DELIVERY_THRESHOLD,
    freeDeliveryEnabled: map.freeDeliveryEnabled ?? DEFAULT_FREE_DELIVERY_ENABLED,
    businessRadius: map.businessRadius ?? DEFAULT_BUSINESS_RADIUS,
  })
})

const updateSettings = asyncHandler(async (req, res) => {
  const { deliveryCharge, freeDeliveryThreshold, freeDeliveryEnabled, businessRadius } = req.body

  if (deliveryCharge !== undefined) {
    const val = Number(deliveryCharge)
    if (isNaN(val) || val < 0) return res.status(400).json({ message: 'Invalid delivery charge' })
    await Settings.findOneAndUpdate(
      { key: 'deliveryCharge' },
      { key: 'deliveryCharge', value: val, label: 'Delivery Charge (₹)' },
      { upsert: true, new: true },
    )
  }

  if (freeDeliveryThreshold !== undefined) {
    const val = Number(freeDeliveryThreshold)
    if (isNaN(val) || val < 0) return res.status(400).json({ message: 'Invalid free delivery threshold' })
    await Settings.findOneAndUpdate(
      { key: 'freeDeliveryThreshold' },
      { key: 'freeDeliveryThreshold', value: val, label: 'Free Delivery Threshold (₹)' },
      { upsert: true, new: true },
    )
  }

  if (freeDeliveryEnabled !== undefined) {
    await Settings.findOneAndUpdate(
      { key: 'freeDeliveryEnabled' },
      { key: 'freeDeliveryEnabled', value: Boolean(freeDeliveryEnabled), label: 'Free Delivery Enabled' },
      { upsert: true, new: true },
    )
  }

  if (businessRadius !== undefined) {
    const val = Number(businessRadius)
    if (isNaN(val) || val <= 0) return res.status(400).json({ message: 'Invalid business radius' })
    await Settings.findOneAndUpdate(
      { key: 'businessRadius' },
      { key: 'businessRadius', value: val, label: 'Business Delivery Radius (km)' },
      { upsert: true, new: true },
    )
  }

  const updated = await Settings.find({})
  const map = {}
  for (const s of updated) map[s.key] = s.value

  res.json({
    message: 'Settings updated',
    deliveryCharge: map.deliveryCharge ?? DEFAULT_DELIVERY_CHARGE,
    freeDeliveryThreshold: map.freeDeliveryThreshold ?? DEFAULT_FREE_DELIVERY_THRESHOLD,
    freeDeliveryEnabled: map.freeDeliveryEnabled ?? DEFAULT_FREE_DELIVERY_ENABLED,
    businessRadius: map.businessRadius ?? DEFAULT_BUSINESS_RADIUS,
  })
})

module.exports = { getSettings, updateSettings }
