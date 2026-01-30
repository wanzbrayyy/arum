const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Order = require('../models/order');
const Shift = require('../models/shift');
const Table = require('../models/table');
const StoreConfig = require('../models/storeConfig');

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'cashier') return next();
  res.redirect('/auth/login');
};

const getShiftRange = () => {
    const now = new Date();
    const hour = now.getHours();
    let start = new Date(now), end = new Date(now);
    
    // Logika Shift: 07:00 - 19:00 (Siang), 19:00 - 07:00 (Malam)
    if (hour >= 7 && hour < 19) {
        start.setHours(7,0,0,0);
        end.setHours(19,0,0,0);
    } else {
        if (hour < 7) start.setDate(start.getDate() - 1);
        start.setHours(19,0,0,0);
        end.setDate(end.getDate() + (hour >= 19 ? 1 : 0));
        end.setHours(7,0,0,0);
    }
    return { start, end };
};

const checkShift = async (req, res, next) => {
    try {
        const activeShift = await Shift.findOne({ 
            cashier: req.user._id, 
            status: 'Open'
        });
        req.activeShift = activeShift;
        next();
    } catch (e) {
        console.error(e);
        next();
    }
};

router.get('/dashboard', ensureAuthenticated, checkShift, async (req, res) => {
  try {
      const config = await StoreConfig.findOne() || {};
      if(config.isClosed) return res.send("<h1>TOKO SEDANG TUTUP (Closed by Admin)</h1>");

      const products = await Product.find({});
      const tables = await Table.find({});
      
      res.render('cashier/dashboard', {
          user: req.user, 
          products, 
          activeShift: req.activeShift, 
          tables
      });
  } catch (e) {
      console.log(e);
      res.redirect('/auth/login');
  }
});

router.get('/shift/stats', ensureAuthenticated, checkShift, async (req, res) => {
    if (!req.activeShift) return res.status(400).json({ message: 'No active shift' });

    try {
        const orders = await Order.find({
            shift: req.activeShift._id,
            status: 'Completed'
        });

        const totalSales = orders.reduce((acc, order) => acc + order.totalAmount, 0);
        const expectedCash = req.activeShift.startCash + totalSales;

        res.json({
            startCash: req.activeShift.startCash,
            totalSales: totalSales,
            expectedCash: expectedCash
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/shift/start', ensureAuthenticated, async (req, res) => {
    try {
        const { startCash } = req.body;
        // Tutup shift lama jika ada yang nyangkut
        await Shift.updateMany({ cashier: req.user._id, status: 'Open' }, { status: 'Closed', endTime: Date.now() });

        const newShift = new Shift({
            cashier: req.user._id,
            startCash: parseInt(startCash) || 0,
            status: 'Open',
            startTime: Date.now()
        });
        await newShift.save();
        res.redirect('/cashier/dashboard');
    } catch (err) {
        console.error(err);
        res.redirect('/cashier/dashboard');
    }
});

router.post('/shift/end', ensureAuthenticated, async (req, res) => {
    try {
        const { actualCash } = req.body;
        const shift = await Shift.findOne({ cashier: req.user._id, status: 'Open' });

        if (shift) {
            const orders = await Order.find({ shift: shift._id, status: 'Completed' });
            const totalSales = orders.reduce((acc, order) => acc + order.totalAmount, 0);

            shift.endTime = Date.now();
            shift.status = 'Closed';
            shift.endCash = parseInt(actualCash) || 0;
            shift.expectedCash = shift.startCash + totalSales;

            await shift.save();
        }
        res.redirect('/auth/logout');
    } catch (err) {
        console.error("Shift End Error:", err);
        res.redirect('/cashier/dashboard');
    }
});

router.post('/order', ensureAuthenticated, checkShift, async (req, res) => {
  if (!req.activeShift) return res.status(403).json({ message: 'Shift belum dibuka. Refresh halaman.' });

  const { items, tableId, customerName, action, orderId } = req.body;
  
  try {
      // 1. Queue Number Logic
      const todayStart = new Date(); 
      todayStart.setHours(0,0,0,0);
      const queueCount = await Order.countDocuments({ orderDate: { $gte: todayStart } });
      
      let orderItems = [];
      let totalAmount = 0;

      // 2. Process Items & Stock
      for (const i of items) {
          const p = await Product.findById(i.productId);
          if(p) {
              if(action === 'pay') {
                  p.stock -= i.quantity; // Kurangi stok hanya jika bayar lunas
                  await p.save();
              }
              totalAmount += p.price * i.quantity;
              orderItems.push({
                  product: p._id, 
                  productName: p.name, 
                  quantity: i.quantity,
                  priceAtOrder: p.price, 
                  costAtOrder: p.cost || 0
              });
          }
      }

      // 3. Table Logic
      let tableData = null;
      let tableName = 'Takeaway';
      if(tableId) {
          const table = await Table.findById(tableId);
          if(table) {
              tableData = table._id;
              tableName = table.name;
          }
      }

      // 4. Create Order
      const newOrder = new Order({
          cashier: req.user._id, 
          items: orderItems, 
          totalAmount,
          customerName: customerName || 'Guest',
          tableId: tableData,
          tableName: tableName,
          queueNumber: queueCount + 1,
          status: action === 'hold' ? 'Held' : 'Completed',
          paymentMethod: action === 'pay' ? 'Cash' : 'Pending',
          shift: req.activeShift._id
      });

      await newOrder.save();

      // 5. Update Table Status
      if(tableId && action === 'hold') {
          await Table.findByIdAndUpdate(tableId, { status: 'Occupied', currentOrderId: newOrder._id });
      } else if (tableId && action === 'pay') {
          await Table.findByIdAndUpdate(tableId, { status: 'Dirty', currentOrderId: null });
      }

      // 6. Delete Old Order if exists (Resume case)
      if(orderId) await Order.findByIdAndDelete(orderId);

      res.json({ message: 'Success', order: newOrder });

  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/order/void', ensureAuthenticated, async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const order = await Order.findById(orderId);
        if(order) {
            order.status = 'Void';
            order.voidReason = reason;
            
            // Kembalikan Stok
            for(let item of order.items) {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
            }
            await order.save();
        }
        res.json({ message: 'Void Success' });
    } catch(e) {
        res.status(500).json({ message: 'Void Failed' });
    }
});

router.get('/held-orders', ensureAuthenticated, async (req, res) => {
    try {
        const orders = await Order.find({ status: 'Held' }).sort({ orderDate: -1 });
        res.json(orders);
    } catch(e) {
        res.status(500).json({ message: 'Error fetching held orders' });
    }
});

module.exports = router;