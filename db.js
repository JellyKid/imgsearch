var mongodb = require('mongodb');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/imgsearch');

module.exports = mongoose.connection;
