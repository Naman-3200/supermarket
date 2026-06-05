const WithdrawalRequest = require('../models/WithdrawalRequest')
const asyncHandler = require('../utils/asyncHandler')

const createWithdrawalRequest = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, upiId, bankAccountNumber, bankIfsc, bankAccountHolder, bankName } = req.body

  if (!amount || Number(amount) < 1) {
    return res.status(400).json({ message: 'Invalid withdrawal amount' })
  }
  if (!['upi', 'bank'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Invalid payment method' })
  }
  if (paymentMethod === 'upi' && !upiId?.trim()) {
    return res.status(400).json({ message: 'UPI ID is required' })
  }
  if (paymentMethod === 'bank' && (!bankAccountNumber?.trim() || !bankIfsc?.trim() || !bankAccountHolder?.trim())) {
    return res.status(400).json({ message: 'Bank account number, IFSC, and account holder name are required' })
  }

  const pending = await WithdrawalRequest.findOne({ deliveryPartnerId: req.user._id, status: 'pending' })
  if (pending) {
    return res.status(400).json({ message: 'You already have a pending withdrawal request' })
  }

  const request = await WithdrawalRequest.create({
    deliveryPartnerId: req.user._id,
    amount: Number(amount),
    paymentMethod,
    upiId: upiId || '',
    bankAccountNumber: bankAccountNumber || '',
    bankIfsc: bankIfsc || '',
    bankAccountHolder: bankAccountHolder || '',
    bankName: bankName || '',
  })

  res.status(201).json({ message: 'Withdrawal request submitted', request })
})

const getMyWithdrawalRequests = asyncHandler(async (req, res) => {
  const requests = await WithdrawalRequest.find({ deliveryPartnerId: req.user._id }).sort({ createdAt: -1 })
  res.json({ requests })
})

const getAllWithdrawalRequests = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.status) filter.status = req.query.status

  const requests = await WithdrawalRequest.find(filter)
    .populate('deliveryPartnerId', 'username phone email')
    .sort({ createdAt: -1 })
  res.json({ requests })
})

const updateWithdrawalStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body
  const validStatuses = ['approved', 'rejected', 'paid']

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }

  const request = await WithdrawalRequest.findById(req.params.id)
  if (!request) return res.status(404).json({ message: 'Withdrawal request not found' })

  request.status = status
  if (adminNotes !== undefined) request.adminNotes = adminNotes
  if (['approved', 'rejected', 'paid'].includes(status)) request.processedAt = new Date()

  await request.save()
  res.json({ message: 'Withdrawal request updated', request })
})

module.exports = { createWithdrawalRequest, getMyWithdrawalRequests, getAllWithdrawalRequests, updateWithdrawalStatus }
