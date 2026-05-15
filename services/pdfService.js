const { fromPath } = require("pdf2pic");
const path = require("path");
const os = require("os");

/**
 * Ekstrak halaman pertama PDF sebagai file PNG
 * @param {string} pdfPath - Path ke file PDF sementara
 * @returns {string} Path ke file PNG hasil ekstraksi
 */
async function extractCoverFromPdf(pdfPath) {
  const outputDir = os.tmpdir();
  const outputName = path.basename(pdfPath, path.extname(pdfPath)) + "-cover";

  const options = {
    density: 150,        // DPI - cukup untuk cover thumbnail
    saveFilename: outputName,
    savePath: outputDir,
    format: "png",
    width: 600,
    height: 800,
  };

  const converter = fromPath(pdfPath, options);

  // Ekstrak hanya halaman 1
  const result = await converter(1, { responseType: "image" });

  if (!result || !result.path) {
    throw new Error("Failed to extract cover from PDF");
  }

  return result.path; // e.g. /tmp/upload-12345-cover.1.png
}

module.exports = { extractCoverFromPdf };
