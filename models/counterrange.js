var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const CounterRange = new Schema({
  start: { type: Number, default: 0},
  incrementValue: { type: Number, default: 10000}
});

module.exports = mongoose.model('CounterRange', CounterRange);
