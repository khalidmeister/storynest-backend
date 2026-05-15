const fs = require("fs");
const supabase = require("../lib/supabase");
const { extractCoverFromPdf } = require("../services/pdfService");
const { uploadBookFiles, deleteBookFiles, getPublicUrl, getSignedUrl, PDF_BUCKET, COVER_BUCKET } = require("../services/storageService");
const { bookSchema, bookUpdateSchema } = require("../validators/bookValidator");

// Helper: cleanup temp files
function cleanupTempFiles(...paths) {
  for (const p of paths) {
    if (p && fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch (_) {}
    }
  }
}

// ─────────────────────────────────────────
// GET /admin/books
// ─────────────────────────────────────────
async function getAllBooks(req, res, next) {
  try {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 1. Map dulu jadi array of promises
    const bookPromises = data.map(async (book) => {
      // Gunakan await di sini karena getSignedUrl itu async
      const signedPdfUrl = await getSignedUrl(PDF_BUCKET, book.pdf_filename);
      
      return {
        ...book,
        cover_url: getPublicUrl(COVER_BUCKET, book.cover_filename),
        pdf_url: signedPdfUrl,
      };
    });

    // 2. TUNGGUIN semua promise kelar pake Promise.all
    const books = await Promise.all(bookPromises);

    res.json({ data: books });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────
// POST /admin/books
// ─────────────────────────────────────────
async function createBook(req, res, next) {
  let pdfPath = null;
  let coverPath = null;

  try {
    // 1. Validasi file PDF wajib ada
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }
    pdfPath = req.file.path;

    // 2. Validasi metadata dengan Zod
    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const metadata = parsed.data;

    // 3. Ekstrak cover dari halaman pertama PDF
    // coverPath = await extractCoverFromPdf(pdfPath);
    try {
      coverPath = await extractCoverFromPdf(pdfPath);
    } catch (extractErr) {
      return res.status(400).json({ 
        error: "Failed to extract cover. Make sure the PDF is valid." 
      });
    }

    // 4. Upload PDF + cover ke Supabase Storage
    const { pdf_filename, cover_filename } = await uploadBookFiles(pdfPath, coverPath);

    // 5. Simpan metadata ke tabel books
    const { data, error } = await supabase
      .from("books")
      .insert({
        ...metadata,
        pdf_filename,
        cover_filename,
      })
      .select()
      .single();

    if (error) {
      // Rollback: hapus file yang sudah terupload
      await deleteBookFiles(pdf_filename, cover_filename);
      throw error;
    }

    res.status(201).json({
      message: "Book created successfully",
      data: {
        ...data,
        cover_url: getPublicUrl(COVER_BUCKET, cover_filename),
        pdf_url: getPublicUrl(PDF_BUCKET, pdf_filename),
      },
    });
  } catch (err) {
    next(err);
  } finally {
    cleanupTempFiles(pdfPath, coverPath);
  }
}

// ─────────────────────────────────────────
// PUT /admin/books/:id
// ─────────────────────────────────────────
async function updateBook(req, res, next) {
  let newPdfPath = null;
  let newCoverPath = null;

  try {
    const { id } = req.params;

    // 1. Cek buku ada
    const { data: existing, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: "Book not found" });
    }

    // 2. Validasi metadata (partial — semua field opsional)
    const parsed = bookUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const updates = parsed.data;

    let pdf_filename = existing.pdf_filename;
    let cover_filename = existing.cover_filename;

    // 3. Jika ada PDF baru: hapus lama, upload baru, re-ekstrak cover
    if (req.file) {
      newPdfPath = req.file.path;

      // Hapus file lama di storage
      await deleteBookFiles(existing.pdf_filename, existing.cover_filename);

      // Ekstrak cover dari PDF baru
      newCoverPath = await extractCoverFromPdf(newPdfPath);

      // Upload file baru
      const uploaded = await uploadBookFiles(newPdfPath, newCoverPath);
      pdf_filename = uploaded.pdf_filename;
      cover_filename = uploaded.cover_filename;
    }

    // 4. Update database
    const { data: updated, error: updateError } = await supabase
      .from("books")
      .update({ ...updates, pdf_filename, cover_filename, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      message: "Book updated successfully",
      data: {
        ...updated,
        cover_url: getPublicUrl(COVER_BUCKET, cover_filename),
        pdf_url: getPublicUrl(PDF_BUCKET, pdf_filename),
      },
    });
  } catch (err) {
    next(err);
  } finally {
    cleanupTempFiles(newPdfPath, newCoverPath);
  }
}

// ─────────────────────────────────────────
// DELETE /admin/books/:id
// ─────────────────────────────────────────
async function deleteBook(req, res, next) {
  try {
    const { id } = req.params;

    // 1. Cek buku ada dan ambil filenames
    const { data: existing, error: fetchError } = await supabase
      .from("books")
      .select("pdf_filename, cover_filename")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: "Book not found" });
    }

    // 2. Hapus dari database dulu
    const { error: deleteError } = await supabase.from("books").delete().eq("id", id);
    if (deleteError) throw deleteError;

    // 3. Cleanup storage (Cleanup Policy)
    await deleteBookFiles(existing.pdf_filename, existing.cover_filename);

    res.json({ message: "Book deleted successfully", id });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllBooks, createBook, updateBook, deleteBook };
