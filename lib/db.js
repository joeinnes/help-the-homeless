var mongoose = require('mongoose')
mongoose.connect(process.env.MONGOCONNECTIONSTRING)

module.exports = mongoose
