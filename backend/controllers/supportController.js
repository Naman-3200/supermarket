const SupportTicket = require('../models/SupportTicket')
const asyncHandler = require('../utils/asyncHandler')

const getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ userId: req.user._id })
    .populate('orderId', 'orderNumber')
    .sort({ createdAt: -1 })
  res.json({ tickets })
})

const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('orderId', 'orderNumber totalAmount')
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' })
  res.json({ ticket })
})

const createTicket = asyncHandler(async (req, res) => {
  const { subject, message, category, orderId, priority } = req.body
  if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required' })

  const ticket = await SupportTicket.create({
    userId: req.user._id,
    orderId: orderId || null,
    subject,
    message,
    category: category || 'other',
    priority: priority || 'medium',
  })

  res.status(201).json({ message: 'Support ticket created', ticket })
})

const addReply = asyncHandler(async (req, res) => {
  const { message: replyMessage } = req.body
  if (!replyMessage) return res.status(400).json({ message: 'Message is required' })

  const query = req.user.role === 'admin'
    ? { _id: req.params.id }
    : { _id: req.params.id, userId: req.user._id }

  const ticket = await SupportTicket.findOne(query)
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' })

  ticket.replies.push({
    sender: req.user.role === 'admin' ? 'admin' : 'user',
    message: replyMessage,
    senderName: req.user.username,
  })

  if (req.user.role === 'admin' && ticket.status === 'open') {
    ticket.status = 'in_progress'
  }

  await ticket.save()
  res.json({ message: 'Reply added', ticket })
})

const updateTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  const ticket = await SupportTicket.findById(req.params.id)
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' })
  ticket.status = status
  await ticket.save()
  res.json({ message: 'Ticket status updated', ticket })
})

const getAllTickets = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.status) filter.status = req.query.status
  const tickets = await SupportTicket.find(filter)
    .populate('userId', 'username email phone')
    .populate('orderId', 'orderNumber')
    .sort({ createdAt: -1 })
  res.json({ tickets })
})

module.exports = { getMyTickets, getTicketById, createTicket, addReply, updateTicketStatus, getAllTickets }
