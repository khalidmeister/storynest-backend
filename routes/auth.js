const express = require('express');
const router = express.Router();
const { login, signup } = require('../controllers/authController');

/**
 * POST /auth/login
 * Body:
 *  - email: email
 *  - password: password
 */
router.post('/login', login);

/**
 * POST /auth/signup
 * Body:
 *  - email: email
 *  - password: password
 */
router.post('/signup', signup)

module.exports = router;