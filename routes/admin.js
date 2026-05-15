const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");
const upload = require("../middleware/upload");
const { getAllBooks, createBook, updateBook, deleteBook } = require("../controllers/adminController");

// Semua route di bawah ini dilindungi oleh middleware isAdmin
router.use(isAdmin);

/**
 * GET /admin/books
 * Ambil semua buku beserta metadata lengkap
 */
router.get("/books", getAllBooks);

/**
 * POST /admin/books
 * Buat buku baru — terima file PDF, auto-ekstrak cover
 * Body (multipart/form-data):
 *   - file: PDF file
 *   - title, author, category, description, price, age_min, age_max, is_published
 */
router.post("/books", upload.single("file"), createBook);

/**
 * PUT /admin/books/:id
 * Update metadata buku — opsional re-upload PDF baru
 * Body (multipart/form-data atau JSON):
 *   - file (opsional): PDF baru
 *   - field-field yang ingin diupdate
 */
router.put("/books/:id", upload.single("file"), updateBook);

/**
 * DELETE /admin/books/:id
 * Hapus buku dari DB dan cleanup file di Storage
 */
router.delete("/books/:id", deleteBook);

module.exports = router;
