const { cloudinary, isConfigured } = require('../config/cloudinary');

/**
 * Uploads an image buffer or multer file to Cloudinary in the specified folder
 */
async function uploadImage(fileOrBuffer, mimetypeOrFolder = 'image/jpeg', targetFolder = 'general') {
  let fileBuffer;
  let mimetype = 'image/jpeg';
  let folder = targetFolder;

  // Handle Multer file object vs raw buffer
  if (fileOrBuffer && Buffer.isBuffer(fileOrBuffer.buffer)) {
    fileBuffer = fileOrBuffer.buffer;
    mimetype = fileOrBuffer.mimetype || 'image/jpeg';
    folder = typeof mimetypeOrFolder === 'string' && mimetypeOrFolder.includes('/') ? targetFolder : mimetypeOrFolder;
  } else if (Buffer.isBuffer(fileOrBuffer)) {
    fileBuffer = fileOrBuffer;
    mimetype = mimetypeOrFolder || 'image/jpeg';
  } else {
    const error = new Error('No valid file buffer provided for image upload.');
    error.statusCode = 400;
    throw error;
  }

  const cloudFolder = `p2g/${folder}`;

  // If Cloudinary credentials are configured, attempt upload via Cloudinary SDK
  if (isConfigured()) {
    try {
      const dataUri = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: cloudFolder,
        resource_type: 'image',
        secure: true,
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('[Cloudinary Upload Error]:', error.message || error);
      // In development mode with invalid credentials, log warning and fallback gracefully
      if (process.env.NODE_ENV !== 'production' && (error.http_code === 401 || (error.message && error.message.includes('cloud_name')))) {
        console.warn(`[Cloudinary Warning]: Authentication failed (${error.message}). Falling back to development simulated storage.`);
      } else {
        const uploadError = new Error(`Cloudinary upload failed: ${error.message || 'Unknown error'}`);
        uploadError.statusCode = error.http_code || 502;
        throw uploadError;
      }
    }
  }

  // Graceful simulation fallback for local development or testing without live credentials
  const randomSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const publicId = `${cloudFolder}/${randomSuffix}`;
  const simulatedSecureUrl = `https://res.cloudinary.com/p2g-store/image/upload/v1/${publicId}.webp`;

  return {
    url: simulatedSecureUrl,
    publicId,
    simulated: true,
  };
}

/**
 * Uploads a product image
 */
async function uploadProductImage(file) {
  return uploadImage(file, 'products');
}

/**
 * Uploads multiple product gallery images
 */
async function uploadMultipleProductImages(files = []) {
  if (!files || !Array.isArray(files) || files.length === 0) return [];
  return Promise.all(files.map((file) => uploadProductImage(file)));
}

/**
 * Uploads a category image
 */
async function uploadCategoryImage(file) {
  return uploadImage(file, 'categories');
}

/**
 * Deletes an image from Cloudinary by public ID
 */
async function deleteImage(publicId) {
  if (!publicId || typeof publicId !== 'string') {
    return { result: 'skipped', message: 'No valid public ID provided' };
  }

  // Security check: prevent deletion of assets outside p2g application folder
  if (!publicId.startsWith('p2g/')) {
    const error = new Error('Invalid public ID: Image deletion is restricted to P2G application assets.');
    error.statusCode = 400;
    throw error;
  }

  if (isConfigured()) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.warn(`[Cloudinary Warning] Error deleting image (${publicId}):`, error.message);
      return { result: 'error', message: error.message, publicId };
    }
  }

  return { result: 'ok', publicId, simulated: true };
}

/**
 * Deletes multiple images from Cloudinary
 */
async function deleteMultipleImages(publicIds = []) {
  const validIds = (publicIds || []).filter((id) => Boolean(id) && typeof id === 'string');
  if (validIds.length === 0) return [];

  return Promise.all(validIds.map((id) => deleteImage(id)));
}

module.exports = {
  uploadImage,
  uploadProductImage,
  uploadMultipleProductImages,
  uploadCategoryImage,
  deleteImage,
  deleteMultipleImages,
};
