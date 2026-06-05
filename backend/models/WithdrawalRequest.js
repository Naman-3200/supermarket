const mongoose = require('mongoose')

const withdrawalRequestSchema = new mongoose.Schema(
  {
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentMethod: { type: String, enum: ['upi', 'bank'], required: true },
    upiId: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
    bankIfsc: { type: String, default: '' },
    bankAccountHolder: { type: String, default: '' },
    bankName: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
    adminNotes: { type: String, default: '' },
    processedAt: { type: Date },
  },
  { timestamps: true },
)

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema)
