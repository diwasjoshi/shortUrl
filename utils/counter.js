var CounterRange = require('../models/counterrange');
const keys = require('../keys.js');

var counter = function() {
    var count=0, instance=null, limit=0;

    this.addCount = function() {
        count++;
        if(count >= limit-1){
          CounterRange.findOne({}, function(err, counterRange, next){
            if(err) return next(err);
            if(!counterRange){
              var ct = new CounterRange();
              count = ct.start;
              limit = ct.start + ct.limit;
              ct.start = keys.COUNTER_INCREMENT_VALUE;
              ct.incrementValue = keys.COUNTER_INCREMENT_VALUE
              ct.save();
            }else{
              count = counterRange.start;
              limit = counterRange.start + counterRange.incrementValue;
              counterRange.start += counterRange.incrementValue;
              counterRange.save();
            }
            return count;
          });
        }
    }

    this.getCount = function() {
          return count;
    }
}

counter.getInstance = function() {
    if (this.instance === null || this.instance == undefined) {
        this.instance = new counter();
    }

    return this.instance;
}

module.exports = counter.getInstance();
