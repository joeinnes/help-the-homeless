const db = require('../lib/db')
const ReportSchema = require('../models/Report')
const Report = db.model('Report', ReportSchema)
const axios = require('axios')
const jwtAuth = require('socketio-jwt-auth')

function sockets (io) {
  io.use(jwtAuth.authenticate({
    secret: process.env.SERVERSECRET
  }, function (payload, done) {
    console.log(payload)

    return done(null, payload)
  }))

  io.on('connection', (socket) => {
    console.log(socket.request.user.name + ' connected')
    let roles = socket.request.user.roles
    let stream

    if (!roles) {
      roles = ['user']
    }

    if (roles.indexOf('admin') > -1) { // Admins can see all reports, but limiting to 100
      stream = Report.find().sort().limit(100).cursor()
    } else if (roles.indexOf('dispatcher') > -1) { // Dispatchers don't need to see any reports older than a certain number of hours
      let nineHours = new Date()
      nineHours.setHours(nineHours.getHours() - 9)
      stream = Report.find({
        reportedAt: {
          $gte: nineHours
        }
      }).sort().cursor()
    } else if (roles.indexOf('crisisCar') > -1) { // Crisis car drivers only need to see triaged and dispatched reports
      stream = Report.find({
        type: 2
      }).sort().cursor()
    } else { // otherwise you only get to see your own reports, (but you can see all of them)
      stream = Report.find({
        'reportedBy.name': socket.request.user.name
      }).sort().cursor()
    }

    stream.on('data', (report) => {
      socket.emit('report created', report) // Not technically a 'created' event, but simulating is helpful for first run
    })

    socket.on('disconnect', () => {
      console.log(socket.request.user.name + ' connected')
    })

    socket.on('new report', (report) => {
      console.log(socket.request.user.name + ' created a new report')
      axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
        params: {
          latlng: `${report.lat},${report.lng}`
        }
      })
        .then(function (response) {
          let address = ''
          try {
            address = response.data.results[0].formatted_address
          } catch (e) {
            address = `${response.lat}, ${response.lng}`
          }

          let newReport = new Report({
            reportedBy: socket.request.user,
            loc: {
              type: 'Point',
              coordinates: [parseFloat(report.lng), parseFloat(report.lat)]
            },
            priority: 0,
            type: 0,
            state: 0,
            notes: report.notes,
            reportedAt: new Date(),
            address: address
          })

          let thisReport = newReport.save()
          thisReport
            .then((data) => {
              console.log('New report!')
              io.emit('report created', data)
            })
            .catch((err) => {
              console.log(err)
            })
        })
        .catch(function (error) {
          console.log(error)
        })
    })

    socket.on('priority change', (payload) => {
      console.log(socket.request.user.name + ' changed the priority of a report')
      let update
      if (roles.indexOf('dispatcher') > -1) {
        update = Report.findOneAndUpdate({_id: payload.id}, { $set: { priority: payload.priority }, $max: { type: 1 } }, { new: true })
      } else {
        update = Report.findOneAndUpdate({_id: payload.id}, { $set: { priority: payload.priority } }, { new: true })
      }
      update.then((updatedDoc) => {
        io.emit('report updated', updatedDoc)
      })
    })

    socket.on('dispatch', (id) => {
      console.log(socket.request.user.name + ' requested a dispatch')
      let update
      if (roles.indexOf('dispatcher') > -1) {
        update = Report.findOneAndUpdate({_id: id}, { $max: { type: 2 } }, { new: true })
      } else {
        console.log('An unauthorised attender attempted to dispatch')
        return
      }
      update.then((updatedDoc) => {
        console.log(updatedDoc)
        io.emit('report updated', updatedDoc)
      })
    })

    socket.on('attended', (id) => {
      console.log(socket.request.user.name + ' attended a report')
      let update
      if (roles.indexOf('crisisCar') > -1) {
        update = Report.findOneAndUpdate({_id: id}, { $max: { type: 3 } }, { new: true })
      } else {
        console.log('An unauthorised attender attempted to update')
        return
      }
      update.then((updatedDoc) => {
        io.emit('report updated', updatedDoc)
      })
    })
  })
}

module.exports = sockets
