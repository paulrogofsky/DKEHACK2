var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var app = express();
app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
});
app.engine('html',require('hogan-express'));
app.set('view engine', 'html')
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({secret: 'PIZZA'}));
console.log("HELLO WORLD");