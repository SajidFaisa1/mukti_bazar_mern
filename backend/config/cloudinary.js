const cloudinary = require('cloudinary').v2;

// Configure Cloudinary using environment variables.
// If CLOUDINARY_URL is set, the SDK will parse it automatically; otherwise it
// falls back to CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.
// Do NOT add code that uploads here—keep this file strictly for configuration.
cloudinary.config();


module.exports = cloudinary;
