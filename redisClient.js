const keys = require('./keys.js');
var redis = require('redis');
var redisClient = redis.createClient({port: keys.REDIS_PORT, host: keys.REDIS_HOST, password: keys.REDIS_PASS});
redisClient.config("SET", "notify-keyspace-events", "KExe");

/*var RedisNotifier = require('redis-notifier');

var eventNotifier = new RedisNotifier(redis, {
  redis : { host : '127.0.0.1', port : 6379 },
  expired : true,
  evicted : true,
});

//Listen for event emission
eventNotifier.on('message', function(pattern, channelPattern, emittedKey) {
  var channel = this.parseMessageChannel(channelPattern);
  switch(channel.key) {
    case 'expired':
        console.log(redisClient.hgetall(emittedKey, function(err, reply){
            console.log(err);
            console.log(reply);
        }));
      break;
    default:
      logger.debug("Unrecognized Channel Type:" + channel.type);
  }
});*/

redisClient.on('connect', function() {
    console.log('Redis client connected');
});

module.exports = redisClient;
