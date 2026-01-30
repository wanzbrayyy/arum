const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/user');

router.get('/login', (req, res) => res.render('auth/login'));

router.get('/register', (req, res) => res.render('auth/register'));

router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.render('auth/register', { msg: 'User already exists' });
    }
    user = new User({
      username,
      password,
      role
    });
    await user.save();
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    res.render('auth/register', { msg: 'Server Error' });
  }
});

router.post('/login', passport.authenticate('local', {
  failureRedirect: '/auth/login',
  failureFlash: true
}), (req, res) => {
  if (req.user.role === 'admin') {
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/cashier/dashboard');
  }
});

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;