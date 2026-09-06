const express = require('express');
const { generateReport, getReport } = require('../controllers/report.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/generate/:interviewId', verifyToken, generateReport);
router.get('/interview/:interviewId', verifyToken, getReport);

module.exports = router;
