const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  cost: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  category: { type: String, required: true }
});

module.exports = mongoose.model('Product', ProductSchema);