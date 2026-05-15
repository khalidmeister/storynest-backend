const express = require("express");
const router = express.Router();
const { getAllUserBooks, getBookDetails } = require('../controllers/bookController')
const { attachUserContext } = require('../middleware/authMiddleware');

/**
 * GET /book/list
 * Ambil semua buku dari library dan dikasih paywall untuk buku yang belum dibeli user 
 * dan semua buku dimana user belum subscribe
 */
router.get("/list", attachUserContext, getAllUserBooks);

/**
 * GET /book/:id
 */
router.get("/:id", attachUserContext, getBookDetails);

module.exports = router;