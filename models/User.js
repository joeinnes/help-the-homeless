
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UserSchema = new Schema({
  name: String,
  contactNo: String,
  lang: String,
  photo: String,
  roles: Array,
  googleId: String
})

module.exports = UserSchema
