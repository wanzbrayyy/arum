const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  width: { type: Number, default: 100 },
  height: { type: Number, default: 100 },
  type: { type: String, enum: ['Normal', 'cafeshop', 'PS'], default: 'Normal' },
  status: { type: String, enum: ['Empty', 'Occupied', 'Dirty', 'Reserved'], default: 'Empty' },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  startTime: { type: Date, default: null } 
});

module.exports = mongoose.model('Table', TableSchema);