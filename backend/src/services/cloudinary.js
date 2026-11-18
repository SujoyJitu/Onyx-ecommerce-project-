const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function isConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function requireCloudinary() {
  if (!isConfigured()) {
    const error = new Error('Image uploads are not configured. Add the Cloudinary credentials to the backend environment.');
    error.statusCode = 503;
    throw error;
  }
}

function uploadImageBuffer(buffer) {
  requireCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'onyx/products', resource_type: 'image' }, (error, result) => {
      if (error) {
        const uploadError = new Error('Cloudinary could not upload the image.');
        uploadError.statusCode = 502;
        return reject(uploadError);
      }
      return resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}

async function deleteImages(images = []) {
  if (!isConfigured()) return;
  const results = await Promise.allSettled(images.filter((image) => image?.publicId).map((image) => cloudinary.uploader.destroy(image.publicId, { resource_type: 'image' })));
  results.filter((result) => result.status === 'rejected').forEach((result) => console.error('Cloudinary image cleanup failed:', result.reason.message));
}

module.exports = { uploadImageBuffer, deleteImages };
