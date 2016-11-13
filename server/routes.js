const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router()
const db = require('../lib/db')
const ReportSchema = require('../models/Report')
const Report = db.model('Report', ReportSchema)
const UserSchema = require('../models/User')
const User = db.model('User', UserSchema)
const jwt = require('jsonwebtoken')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Google profile), and
//   invoke a callback with a user object.
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLECONSUMERKEY,
    clientSecret: process.env.GOOGLECONSUMERSECRET,
    callbackURL: process.env.HOST + "/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    let user = User.findOne({ googleId: profile.id })
    user.then((data) => {
      if (data) {
        return done(null, data)
      } else {
        let lang = ''
        
        switch (profile._json.language) {
          case 'hu_HU':
            lang = 'hu'
          default:
            lang = 'gb'
        }
        
        let newUser = new User({
          googleId: profile.id,
          name: profile.displayName,
          photo: profile.photos[0].value,
          lang: lang,
          roles: ['user']
        })
        
        let save = newUser.save()
        
        save
        .then((data) => {
          return done(null, data)
        })
        
        .catch((err) => {
          return done(err, null)
        })
      }
    })
    .catch((err) => {
      return done(err, null)
    })
  }
));

// GET
router.get('/', (req, res) => {
  let nagMsg = ''
  if (!req.user) {
    nagMsg = 'You\'re not logged in!',
    res.render('index', {
      user: null,
      nag: nagMsg
    })
    return
  }
  
  if (!req.user.contactNo) {
    nagMsg += 'We\'d really like your phone number to contact you about reports! Add it to your profile.'
  }
  
  res.render('index', {
    user: req.user,
    nag: nagMsg
  })
  
})

router.get('/auth/google',
  passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/userinfo.profile' }))

router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/', session: true }),
  (req, res) => {
    res.redirect('/')
  })

router.get('/profile', (req, res) => {
  res.render('profile', {
    user: req.user
  })
})

router.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

router.post('/get-jwt', function (req, res) {
  if (!req.user) {
    res.status(401).send('You aren\'t logged in')
  }
  // we are sending the profile in the token
  let token = jwt.sign(req.user, process.env.SERVERSECRET, { expiresIn: 60*60*24*7 }) // Valid for secs * mins * hrs * days
  res.json({token: token});
})

router.post('/profile', (req, res) => {
  if (!req.user) {
    res.status(401).send('You aren\'t logged in')
  }
  let contactNo = req.body.contactNo
  let lang = req.body.lang
  let update = User.findOneAndUpdate({ googleId: req.user.googleId }, { $set: {
    lang: lang,
    contactNo: contactNo
  }}, { new: true })
  update.then((newUser) => {
    // User has to be logged in again, otherwise the updated data won't be reflected
    req.logIn(newUser, function(error) {
      if (!error) {
        res.status(200).send('Updated successfully')
      } else {
        res.status(500).send('There was a problem reloading the session! ' + err)
      }
    })
  })
  .catch((err) => {
    res.status(500).send('Error! ' + err)
  })
})

module.exports = router