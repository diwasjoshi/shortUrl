const keys = require('../keys.js');
const redisClient = require('../redisClient');
const amqp = require('amqplib/callback_api');
var ShortUrl = require('../models/shorturl');

amqp.connect(keys.AQMP_HOST, function(err, conn) {
  conn.createChannel(function(err, ch) {
    const q = keys.AMQP_DELETE_QUEUE;
    ch.assertQueue(q, { durable: true });

    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
    ch.consume(q, async function(msg) {
      console.log(" [x] Received %s", msg.content.toString());

      var shortCode = JSON.parse(msg.content.toString()).shortCode;
      await redisClient.del(shortCode);
      await ShortUrl.deleteOne({shortCode});
      ch.ack(msg);

    }, { noAck: false });
  });
});
