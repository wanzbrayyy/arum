
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(
  session({
    secret: 'secretkeywarkop',
    resave: false,
    saveUninitialized: false
  })
);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/cashier', require('./routes/cashier'));
app.use('/client', require('./routes/client'));
app.use('/kitchen', require('./routes/kitchen'));

app.get('/api/products', async (req, res) => {
  const Product = require('./models/product');
  const products = await Product.find({});
  res.json(products);
});

app.get('/', (req, res) => res.redirect('/auth/login'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`Server running on port ${PORT}`));