const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName: { type: String, default: 'Guest' },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
  tableName: { type: String, default: 'Takeaway' }, 
  queueNumber: { type: Number, default: 0 },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    quantity: Number,
    priceAtOrder: Number,
    costAtOrder: Number,
    notes: String
  }],
  totalAmount: Number,
  taxAmount: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['Cash', 'QRIS', 'Pending'], default: 'Cash' },
  status: { type: String, enum: ['Pending', 'Completed', 'Cancelled', 'Held', 'Void'], default: 'Pending' },
  voidReason: String,
  shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
  orderDate: { type: Date, default: Date.now },
  isCooked: { type: Boolean, default: false },
  isServed: { type: Boolean, default: false }
});

module.exports = mongoose.model('Order', OrderSchema);