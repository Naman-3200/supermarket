const express = require('express')
const { getMyTickets, getTicketById, createTicket, addReply, updateTicketStatus, getAllTickets } = require('../controllers/supportController')
const { protect, restrictTo } = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/my-tickets', protect, getMyTickets)
router.get('/all', protect, restrictTo('admin'), getAllTickets)
router.post('/', protect, createTicket)
router.get('/:id', protect, getTicketById)
router.post('/:id/reply', protect, addReply)
router.patch('/:id/status', protect, restrictTo('admin'), updateTicketStatus)

module.exports = router
