const express = require("express");
const router = express.Router();
const { purchase, subscribe } = require('../controllers/paymentController');
const { attachUserContext } = require('../middleware/authMiddleware');

/**
 * GET /payment/subscribe
 */
router.post('/subscribe', attachUserContext, subscribe);

/**
 * GET /payment/purchase
 */
router.post('/purchase', attachUserContext, purchase);

module.exports = router;