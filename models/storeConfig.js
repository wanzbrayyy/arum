const mongoose = require('mongoose');

const StoreConfigSchema = new mongoose.Schema({
  isClosed: { type: Boolean, default: false },
  taxRate: { type: Number, default: 0 }, 
  serviceRate: { type: Number, default: 0 },
  wifiSSID: String,
  wifiPass: String
});

module.exports = mongoose.model('StoreConfig', StoreConfigSchema);