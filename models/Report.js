
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ReportSchema = new Schema({
  loc: {
    'type': {'type': String }, // Not super elegant, but required as 'type' is a reserved word
    'coordinates': Array
  },
  address: String,
  priority: Number,
  reportedBy: {
    name: String,
    contactNo: String,
    lang: String
  },
  notes: String,
  type: Number,
  state: Number,
  reportedAt: Date
})

module.exports = ReportSchema
