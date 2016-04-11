var https = require('https');
var fs = require('fs');
var path = require('path');
var moment = require('moment');

var clientidfile = path.join(__dirname,'clientid');
var defaults = {
  itemsPerPage: 10,
  page: 0
};

var db = require('./db');
var model = require('./data/model');

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
  console.log('db imgsearch connected');
});

function calcImgurPage(itemsPerPage,page) {
  return Math.floor(page * itemsPerPage / 60);
}

function getClientId(req,res,next) {
  fs.readFile(clientidfile, 'utf8', function(err,clientid){
    if(err){
      return next(new Error(err));
    }
    if(/([\w\d])/.test(clientid)){
      req.clientid = /([\w\d]+)/.exec(clientid)[1];
    }
    return next();
  });
}

function buildPath(req,res,next) {
  req.page = req.query.offset || defaults.page;
  // req.ipp = req.query.ipp || defaults.itemsPerPage;
  req.ipp = defaults.itemsPerPage;
  var imgurPage = calcImgurPage(req.ipp,req.page);
  req.imgsearchpath = '/3/gallery/search/top/'+imgurPage+'.json?q="' + req.params.search + '"';
  return next();
}

function sendData(req,res,next) {
  var start = (req.ipp * req.page)%60;

  if(start < res.data.length){
    var end = start + ((res.data.length < req.ipp) ? res.data.length : req.ipp);
    res.send(res.data.slice(start, end));
    return next();
  }
  res.send({error: "No results found for that offset"});
  return next();
}

function logSearch(req,res,next) {
  var newLog = new model({
    term: req.params.search,
    when: moment.utc().format()
  });
  newLog.save(function(err){
    if(err){
      console.log(err);
    }

  });
}


function newReq(req,res,next) {
  var cid = 'Client-ID ' + req.clientid;
  https.request({
    host: 'api.imgur.com',
    method: 'GET',
    path: req.imgsearchpath,
    headers: {Authorization: cid}
  }, function(result){
    var body = "";
    if(result){
      if (result.statusCode !== 200) {
        return next(new Error(result.statusCode + ':' +result.statusMessage));
      }
      if (result.headers['content-type'] === 'application/json') {
        result.setEncoding('utf8');
        result.on('data',function(data){
          body += data;
        });
        result.on('end',function(){
          var newObj = JSON.parse(body);
          if(newObj.hasOwnProperty('data')){
            res.data = newObj.data;
            return next();
          }
        });
      }
    }
  }).end();
}

function getLog(req, res, next) {
  model.find().lean().select({__v: 0, _id: 0}).sort({when: -1}).limit(10).exec(function(err,logs){
    if(err){
      console.log('err');
      return next(new Error(err.toString()));
    }
    if(logs){
      res.send(logs);
    } else {
      res.send({});
    }
    return next();
  });
}

module.exports = {
  getClientId: getClientId,
  newRequest: newReq,
  buildPath: buildPath,
  sendData: sendData,
  logSearch: logSearch,
  getLog: getLog
};
