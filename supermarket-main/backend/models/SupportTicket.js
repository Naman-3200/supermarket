const mongoose = require('mongoose')

const replySchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['user', 'admin'], required: true },
    message: { type: String, required: true, trim: true },
    senderName: { type: String, default: '' },
  },
  { timestamps: true },
)

const supportTicketSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: ['order_issue', 'payment', 'delivery', 'product', 'refund', 'other'],
      default: 'other',
    },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    replies: { type: [replySchema], default: [] },
    ticketNumber: { type: String, unique: true },
  },
  { timestamps: true },
)

supportTicketSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    this.ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`
  }
  next()
})

module.exports = mongoose.model('SupportTicket', supportTicketSchema)
