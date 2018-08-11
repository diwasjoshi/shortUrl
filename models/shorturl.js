var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//var User = require('./user');

var ShortUrlSchema = new Schema({
  originalUrl: { type: String, required: true },
  shortCode: { type: String, unique: true, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiryDate: Date,
  analytics: {
    hits: { type: Number, default: 0, required: true },
    browserHits: {},
    platformHits: {},
    deviceHits: {},
    perDayHits: {}
  },
  isPrivate: Boolean,
  privateUsers: [],
  //createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('ShortUrl', ShortUrlSchema);
