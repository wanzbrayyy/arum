const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Order = require('../models/order');
const Category = require('../models/category');
const User = require('../models/user');
const Table = require('../models/table');
const Expense = require('../models/expense');
const StoreConfig = require('../models/storeConfig');

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') return next();
  res.redirect('/auth/login');
};

router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.redirect('/admin/reports');
});

router.get('/reports', ensureAuthenticated, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const orders = await Order.find({ status: 'Completed' });
        const expenses = await Expense.find({});
        const voids = await Order.find({ status: 'Void' }).populate('cashier');
        const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        const cogs = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + ((i.costAtOrder || 0) * i.quantity), 0), 0);
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = revenue - cogs - totalExpense;
        const empPerf = await Order.aggregate([ { $match: { status: 'Completed' } }, { $group: { _id: "$cashier", totalSales: { $sum: "$totalAmount" }, count: { $sum: 1 } } }, { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } }, { $unwind: "$user" }, { $sort: { totalSales: -1 } } ]);
        const payMethods = await Order.aggregate([ { $match: { status: 'Completed' } }, { $group: { _id: "$paymentMethod", count: { $sum: 1 } } } ]);
        const heatmap = await Order.aggregate([ { $project: { hour: { $hour: { $add: ["$orderDate", 7*60*60*1000] } } } }, { $group: { _id: { hour: "$hour" }, count: { $sum: 1 } } } ]);
        const topProducts = await Order.aggregate([ { $match: { status: 'Completed' } }, { $unwind: "$items" }, { $group: { _id: "$items.productName", totalSold: { $sum: "$items.quantity" } } }, { $sort: { totalSold: -1 } }, { $limit: 5 } ]);
        const dailyStock = await Order.aggregate([ { $match: { status: 'Completed', orderDate: { $gte: today } } }, { $unwind: "$items" }, { $group: { _id: "$items.product", totalSold: { $sum: "$items.quantity" } } }, { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productInfo" } }, { $unwind: "$productInfo" }, { $sort: { totalSold: -1 } }, { $limit: 10 } ]);
        const pairs = [];
        res.render('admin/reports', { user: req.user, revenue, cogs, totalExpense, netProfit, voids, empPerf, payMethods, heatmap: JSON.stringify(heatmap), pairs, topProducts, dailyStock });
    } catch (e) { console.error(e); res.redirect('/auth/login'); }
});

router.post('/expenses', ensureAuthenticated, async (req, res) => {
    const { description, amount } = req.body;
    await new Expense({ description, amount, recordedBy: req.user._id }).save();
    res.redirect('/admin/reports');
});

router.get('/tables', ensureAuthenticated, async (req, res) => {
    const tables = await Table.find({});
    const config = await StoreConfig.findOne() || new StoreConfig();
    res.render('admin/tables', { user: req.user, tables, config });
});

router.post('/tables/save', ensureAuthenticated, async (req, res) => {
    const { tables } = req.body;
    await Table.deleteMany({});
    if(tables && tables.length > 0) await Table.insertMany(tables);
    res.sendStatus(200);
});

router.post('/store/toggle', ensureAuthenticated, async (req, res) => {
    let config = await StoreConfig.findOne();
    if(!config) config = new StoreConfig();
    config.isClosed = !config.isClosed;
    await config.save();
    res.redirect('/admin/tables');
});

router.get('/products', ensureAuthenticated, async (req, res) => {
    const products = await Product.find({});
    const categories = await Category.find({});
    res.render('admin/products', { user: req.user, products, categories });
});

router.post('/products', ensureAuthenticated, async (req, res) => {
    const { name, price, cost, stock, category } = req.body;
    await new Product({ name, price, cost, stock, category }).save();
    res.redirect('/admin/products');
});

router.post('/products/delete/:id', ensureAuthenticated, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/products');
});

router.get('/categories', ensureAuthenticated, async (req, res) => {
    const categories = await Category.find({});
    res.render('admin/categories', { user: req.user, categories });
});

router.post('/categories', ensureAuthenticated, async (req, res) => {
    await new Category({ name: req.body.name }).save();
    res.redirect('/admin/categories');
});

router.post('/categories/delete/:id', ensureAuthenticated, async (req, res) => {
    await Category.findByIdAndDelete(req.params.id);
    res.redirect('/admin/categories');
});

router.get('/employees', ensureAuthenticated, async (req, res) => {
    const employees = await User.find({ _id: { $ne: req.user._id } });
    res.render('admin/employees', { user: req.user, employees });
});

router.post('/employees/delete/:id', ensureAuthenticated, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/admin/employees');
});

router.get('/qr', ensureAuthenticated, async (req, res) => {
  const tables = await Table.find({});
  const host = req.get('host');
  const baseUrl = `${req.protocol}://${host}`;
  res.render('admin/qrcode', { user: req.user, tables, baseUrl });
});

router.get('/settings', ensureAuthenticated, (req, res) => {
  res.render('admin/settings', { user: req.user });
});

module.exports = router;