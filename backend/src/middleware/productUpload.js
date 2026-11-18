const multer = require('multer');

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 8, fileSize: 5 * 1024 * 1024, fields: 20, fieldSize: 50 * 1024, parts: 28 },
  fileFilter(req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error('Images must be JPEG, PNG, or WebP files.');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
}).fields([{ name: 'images', maxCount: 8 }, { name: 'images[]', maxCount: 8 }]);

function uploadProductImages(req, res, next) {
  productImageUpload(req, res, (error) => {
    if (error) return next(error);
    req.productImageFiles = [...(req.files?.images || []), ...(req.files?.['images[]'] || [])];
    return next();
  });
}

module.exports = { uploadProductImages };
