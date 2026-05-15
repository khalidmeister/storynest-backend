const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");

const PDF_BUCKET = process.env.SUPABASE_PDF_BUCKET || "books-pdf";
const COVER_BUCKET = process.env.SUPABASE_COVER_BUCKET || "books-cover";

/**
 * Upload file ke Supabase Storage
 * @param {string} bucket - Nama bucket
 * @param {string} filePath - Local path file
 * @param {string} mimeType - MIME type file
 * @returns {string} Nama file unik yang disimpan di storage
 */
async function uploadFile(bucket, filePath, mimeType) {
  const ext = path.extname(filePath);
  const filename = uuidv4() + ext;
  const fileBuffer = fs.readFileSync(filePath);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return filename;
}

/**
 * Hapus file dari Supabase Storage
 * @param {string} bucket - Nama bucket
 * @param {string} filename - Nama file di storage
 */
async function deleteFile(bucket, filename) {
  if (!filename) return;

  const { error } = await supabase.storage.from(bucket).remove([filename]);
  if (error) {
    // Log warning tapi jangan throw — jangan block operasi DB
    console.warn(`[STORAGE] Failed to delete ${filename} from ${bucket}: ${error.message}`);
  }
}

/**
 * Upload PDF dan cover, return filenames
 */
async function uploadBookFiles(pdfPath, coverPath) {
  const [pdf_filename, cover_filename] = await Promise.all([
    uploadFile(PDF_BUCKET, pdfPath, "application/pdf"),
    uploadFile(COVER_BUCKET, coverPath, "image/png"),
  ]);
  return { pdf_filename, cover_filename };
}

/**
 * Hapus PDF dan cover dari storage (cleanup policy)
 */
async function deleteBookFiles(pdf_filename, cover_filename) {
  await Promise.all([
    deleteFile(PDF_BUCKET, pdf_filename),
    deleteFile(COVER_BUCKET, cover_filename),
  ]);
}

/**
 * Get public URL untuk sebuah file di storage
 */
function getPublicUrl(bucket, filename) {
  if (!filename) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data?.publicUrl || null;
}

async function getSignedUrl(bucket, filename, expiresIn = 300) {
  if (!filename) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filename, expiresIn); // 300 detik = 5 menit
  
  if (error) return null;
  return data.signedUrl; // URL ini expired after 5 menit
}

module.exports = {
  uploadBookFiles,
  deleteBookFiles,
  getPublicUrl,
  getSignedUrl,
  PDF_BUCKET,
  COVER_BUCKET,
};
