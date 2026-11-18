const multer = require('multer');

const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter(req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      const error = new Error('Shop logos must be JPEG, PNG, or WebP files.');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
}).single('logo');

module.exports = uploadLogo;
