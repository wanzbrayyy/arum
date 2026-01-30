const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  startCash: {
    type: Number,
    required: true,
    default: 0
  },
  endCash: {
    type: Number,
    default: 0
  },
  expectedCash: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Open', 'Closed'],
    default: 'Open'
  },
  note: String
});

module.exports = mongoose.model('Shift', ShiftSchema);