const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const {
  createInterview,
  getInterviews,
  updateInterview,
} = require('../controllers/interview.controller');

const router = express.Router();

// All interview routes require authentication
router.use(verifyToken);

// POST /api/interviews
router.post('/', createInterview);

// GET /api/interviews
router.get('/', getInterviews);

// PATCH /api/interviews/:id
router.patch('/:id', updateInterview);

module.exports = router;
