// Initial Requires
const express = require('express')
const passport = require('passport')
const session = require('express-session')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
require('../lib/sockets')(io)
const routes = require('./routes')

// Config
app.set('view engine', 'ejs')
app.set('trust proxy', 1)

// Middleware
app.use(express.static('public'))
app.use(bodyParser.urlencoded())
app.use(bodyParser.json())
app.use(cookieSession({
  keys: ['key1', 'key2']
}))
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser(function(user, done) {
  done(null, user)
})
//
passport.deserializeUser(function(user, done) {
  // function(id, done)
  // User.findById(id, function(err, user) {
  //  done(err, user);
  // })
  done(null, user)
})

// Routes
app.use('/', routes)

// Start
const listener = http.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})