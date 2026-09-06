const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { getGeminiKey } = require('../controllers/gemini.controller');

const router = express.Router();

// GET /api/gemini/key  (protected — only authenticated users can fetch the key)
router.get('/key', verifyToken, getGeminiKey);

module.exports = router;
