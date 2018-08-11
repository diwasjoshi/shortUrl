var mongoose = require('mongoose');
const keys = require('./keys.js');

var connection = mongoose.connect(keys.MONGO_HOST, function(err){
  if(err){
        console.log(err);
    }else{
        console.log("connected to the " + keys.MONGO_HOST);
    }
});


module.exports = connection;
