const express = require('express');
const router = express.Router();
const keys = require('../keys.js');
var counter = require('../utils/counter.js');
var ShortUrl = require('../models/shorturl');
var User = require('../models/user');

var redisClient = require('../redisClient');
const amqp = require('amqplib/callback_api');

var moment = require('moment');

router.get('/:shortCode', function(req, res, next){
  const { shortCode } = req.params;
  redisClient.hgetall(shortCode, function(err, reply){
    if(err ||  !reply){
      ShortUrl.findOne({shortCode: shortCode}, function(err, shortUrl){
        if(!shortUrl) //if no such url found.
          return res.status(404).send({"status": 404, "message": "url not found"});

        if(shortUrl.isPrivate &&
            !(req.userLoggedIn && shortUrl.privateUsers.includes(req.user.email))){ // if private email and user not in private list.
          return res.status(404).send({"status": 404, "message": "url not found"});
        }

        if(typeof shortUrl.expiryDate !== 'undefined' &&
          new Date().valueOf() >= shortUrl.expiryDate.valueOf()){ // if url is expired.

          deleteUrl(shortUrl.shortCode);  //delete url from storage.
          return res.status(404).send({"status": 404, "message": "url not found"});
        }
        var requiredKeys = ["originalUrl", "expiryDate", "analytics", "shortCode", "isPrivate", "privateUsers"];
        cacheResults(requiredKeys.reduce((acc, cur) => {
          if(cur in shortUrl && shortUrl[cur]){
            acc[cur] = shortUrl[cur];
          }
          return acc;
        }, {}), req.useragent);
        return res.status(200).send({"status": 200, "url": shortUrl.originalUrl});
      });
    }else{
      if(typeof reply.expiryDate !== 'undefined' && new Date().valueOf() >= reply.expiryDate.valueOf()){
        deleteUrl(reply.shortCode);
        return res.status(404).send({"status": 404, "message": "url not found"});
      }

      if('analytics' in reply)
        reply.analytics = JSON.parse(reply.analytics);
      cacheResults(reply, req.useragent);
      return res.status(200).send({"status": 200, "url": reply.originalUrl});
    }
  });
});

router.post('/makeurl', async function(req, res, next) {
  return createUrl(req, res, next);
});

router.post('/geturldata', function(req, res, next){
  const { shortCode } = req.body;
  if(!shortCode)
    return res.status(400).send({"status": 400, "error": "params missing"});

  redisClient.hgetall(shortCode, function(err, reply){
    if(err ||  !reply){
      ShortUrl.findOne({shortCode: shortCode}, function(err, shortUrl){
        var data = {shortCode};
        data.originalUrl = shortUrl.originalUrl;
        data.analytics = shortUrl.analytics;
        data.privateUsers = shortUrl.privateUsers;
        return res.status(200).send({"status": 200, "urldata": data});
      });
    }else{
      if('analytics' in reply)
        reply.analytics = JSON.parse(reply.analytics);

      return res.status(200).send({"status": 200, "urldata": reply});
    }
  });
})

function createUrl(req, res, next){
  const { url, expiryDate, privateEmails } = req.body;
  var shortUrl = new ShortUrl(), num = counter.getCount();
  shortCode = encode(num);

  shortUrl.originalUrl = url;
  shortUrl.shortCode = shortCode;
  shortUrl.num = num;

  if(typeof expiryDate !== 'undefined')
    shortUrl.expiryDate = expiryDate;

  if(req.isLoggedIn && typeof privateEmails !== 'undefined'){
    shortUrl.isPrivate = true;
    shortUrl.privateUsers = privateEmails;
  }

  shortUrl.save(function(err){
    if(err && err.code === 11000){
      if(shortUrl.num === counter.getCount())
        counter.addCount();
      return createUrl(req, res, next);
    }

    if(req.userLoggedIn){
      User.findOne({email: req.user.email}, function(err, user){
          if(user){
            user.urls.push(shortUrl);
            user.save();
          }
      });
    }
    counter.addCount();
    res.status(200).send({"status": 200, shortUrl: keys.SHORT_URLS_HOST + "/" + shortUrl.shortCode, originalUrl: shortUrl.originalUrl});
  });
}

function encode(num){
  const alphabet = keys.ALPHABET;
  var enc = "", base = alphabet.length;

  if (num==0)
    return alphabet[num];

  while(num > 0){
    enc = alphabet[num%base] + enc;
    num = Math.floor(num/base);
  }
  return enc;
}

function deleteUrl(shortCode){
  amqp.connect(keys.AQMP_HOST, function(err, conn) {
    conn.createChannel(function(err, ch) {
      const q = keys.AMQP_DELETE_QUEUE;
      var msg = {'job': 'delete', 'shortCode': shortCode};
      ch.assertQueue(q, { durable: true });
      ch.sendToQueue(q, new Buffer(JSON.stringify(msg)), { persistent: true });
      console.log("Message sent to queue : ", msg);
    });
  });
}

function cacheResults(shortUrl, useragent){

  ['browserHits', 'platformHits', 'perDayHits', 'deviceHits'].forEach(k => {
    if(typeof shortUrl.analytics[k] == 'undefined')
      shortUrl.analytics[k] = {};
  })

  if(useragent.browser in shortUrl.analytics.browserHits)
    shortUrl.analytics.browserHits[useragent.browser]++;
  else
    shortUrl.analytics.browserHits[useragent.browser] = 1;

  if(useragent.platform in shortUrl.analytics.platformHits)
    shortUrl.analytics.platformHits[useragent.platform]++;
  else
    shortUrl.analytics.platformHits[useragent.platform] = 1;

  let day = moment().format('dddd');
  if(day in shortUrl.analytics.perDayHits)
    shortUrl.analytics.perDayHits[day]++;
  else
    shortUrl.analytics.perDayHits[day] = 1;

  let device = useragent.isDesktop ? "Desktop" : "Mobile";
  if(device in shortUrl.analytics.deviceHits)
    shortUrl.analytics.deviceHits[device]++;
  else
    shortUrl.analytics.deviceHits[device] = 1;

  shortUrl.analytics.hits++;
  redisClient.hmset(shortUrl.shortCode, Object.keys(shortUrl).reduce((acc, cur) => {
    if(cur in shortUrl && shortUrl[cur]){
      acc.push(cur);
      if(typeof shortUrl[cur] == "object")
        acc.push(JSON.stringify(shortUrl[cur]));
      else
        acc.push(shortUrl[cur]);
    }
    return acc;
  }, []));
  updateUrl(shortUrl);
}

function updateUrl(shortUrl){
  amqp.connect(keys.AQMP_HOST, function(err, conn) {
    conn.createChannel(function(err, ch) {
      const q = keys.AMQP_UPDATE_QUEUE;
      var msg = {'job': 'update', 'shortUrl': shortUrl};
      ch.assertQueue(q, { durable: true });
      ch.sendToQueue(q, new Buffer(JSON.stringify(msg)), { persistent: true });
      console.log("Message sent to queue : ", msg);
    });
  });
}

module.exports = router;
