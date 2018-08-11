const keys = require('../keys.js');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

var useragent = require('express-useragent');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

const authMiddleware = require('./middleware/authenticate');
const mongoConnection = require('./mongoConnection');
const redisClient = require('./redisClient');
const { deleteWorker, updateWorker } = require('./amqpWorkers/workers.js');
const keys = require('./keys.js');
/*
  Setting up counter
*/
var counter = require('./utils/counter.js');
counter.addCount();


//Enable CORS
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', keys.CLIENT_HOST_TO_ALLOW);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(useragent.express());

// middleware for authentication
app.use(authMiddleware);

// routes handling
app.use('/users', usersRouter);
app.use('/', indexRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);

});




module.exports = app;
