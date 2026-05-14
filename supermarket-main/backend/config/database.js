const mongoose = require('mongoose')
const dns = require('dns')

// Node.js defaults to 127.0.0.1 for DNS on some Windows setups where no
// local resolver is running. Force public DNS so Atlas SRV lookups succeed.
dns.setServers(['8.8.8.8', '1.1.1.1'])

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in environment variables')
  }

  await mongoose.connect(mongoUri)
  console.log('MongoDB connected')
}

module.exports = connectDatabase
