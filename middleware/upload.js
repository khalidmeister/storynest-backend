const multer = require("multer");
const path = require("path");
const os = require("os");

const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Simpan sementara di temp OS directory
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "upload-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File type validation: hanya izinkan PDF
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.fieldname === "file") {
    // Validasi buat PDF
    const allowedMimes = ["application/pdf"];
    if (allowedMimes.includes(file.mimetype) && ext === ".pdf") {
      return cb(null, true);
    }
    return cb(new Error("Field 'file' must be a PDF"), false);
  }

  if (file.fieldname === "cover_file") {
    // Validasi buat Cover Image
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error("Field 'cover' must be an image (JPG/PNG/WebP)"), false);
  }

  // Kalau ada field tak dikenal
  cb(new Error("Unknown field"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: FILE_SIZE_LIMIT },
});

module.exports = upload;
