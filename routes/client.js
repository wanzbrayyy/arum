const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Order = require('../models/order');
const Table = require('../models/table');

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } });
    const { tableId } = req.query;
    
    let tableName = 'Takeaway';
    if (tableId) {
      const table = await Table.findById(tableId);
      if (table) {
        tableName = table.name;
      }
    }
    
    res.render('client/menu', { products, tableId: tableId || null, tableName });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.post('/order', async (req, res) => {
  const { items, customerName, tableId, tableName, paymentMethod } = req.body;
  
  try {
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        await product.save();
        const priceAtOrder = product.price;
        totalAmount += priceAtOrder * item.quantity;
        orderItems.push({
          product: product._id,
          productName: product.name,
          quantity: item.quantity,
          priceAtOrder: priceAtOrder,
          notes: item.notes || ''
        });
      }
    }

    const newOrder = new Order({
      customerName,
      tableId: tableId || null,
      tableName: tableName || 'Takeaway',
      items: orderItems,
      totalAmount,
      paymentMethod,
      status: paymentMethod === 'QRIS' ? 'Completed' : 'Pending'
    });

    await newOrder.save();
    res.json({ message: 'Order placed successfully', orderId: newOrder._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;