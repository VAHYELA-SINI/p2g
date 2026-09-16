const multer = require('multer');

// In-memory buffer storage for direct streaming to Cloudinary
const storage = multer.memoryStorage();

// Validate file MIME types (Requirement 3: File type validation)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
    error.statusCode = 400;
    cb(error, false);
  }
};

// Limit file size to 5MB (Requirement 4: File size validation)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
  },
});

/**
 * Higher-order error wrapper to return standard JSON 400 responses on Multer errors
 */
const handleUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size limit exceeded. Maximum allowed file size is 5MB.',
        });
      }

      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'File upload failed.',
      });
    }

    next();
  });
};

module.exports = {
  uploadSingle: handleUpload(upload.single('image')),
  uploadMultiple: handleUpload(upload.array('images', 5)),
};
