const express = require('express');
const router = express.Router();
const Order = require('../models/order');

router.get('/', async (req, res) => {
    const orders = await Order.find({ 
        status: { $in: ['Completed', 'Pending'] }, 
        $or: [{ isCooked: false }, { isServed: false }] 
    }).populate('items.product').sort({ orderDate: 1 });
    res.render('kitchen/index', { orders });
});

router.post('/cooked/:id', async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { isCooked: true });
    res.sendStatus(200);
});

router.post('/served/:id', async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { isServed: true });
    res.sendStatus(200);
});

module.exports = router;