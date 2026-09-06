const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign(
    { id: user._id, username: user.username, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, username, password } = req.body;

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      username: username.toLowerCase().trim(),
      passwordHash: password, // pre-save hook will hash it
    });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, username: user.username },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    const user = await User.findOne({ username: username.toLowerCase().trim() }).select(
      '+passwordHash'
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, username: user.username },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me  (protected)
 */
const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
