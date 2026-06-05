const Settings = require('../models/Settings')
const asyncHandler = require('../utils/asyncHandler')

const DEFAULT_DELIVERY_CHARGE = 40
const DEFAULT_FREE_DELIVERY_THRESHOLD = 499

const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.find({})
  const map = {}
  for (const s of settings) map[s.key] = s.value

  res.json({
    deliveryCharge: map.deliveryCharge ?? DEFAULT_DELIVERY_CHARGE,
    freeDeliveryThreshold: map.freeDeliveryThreshold ?? DEFAULT_FREE_DELIVERY_THRESHOLD,
  })
})

const updateSettings = asyncHandler(async (req, res) => {
  const { deliveryCharge, freeDeliveryThreshold } = req.body

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

  const updated = await Settings.find({})
  const map = {}
  for (const s of updated) map[s.key] = s.value

  res.json({
    message: 'Settings updated',
    deliveryCharge: map.deliveryCharge ?? DEFAULT_DELIVERY_CHARGE,
    freeDeliveryThreshold: map.freeDeliveryThreshold ?? DEFAULT_FREE_DELIVERY_THRESHOLD,
  })
})

module.exports = { getSettings, updateSettings }
