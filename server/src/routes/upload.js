import express from 'express';
import { protect } from '../middleware/auth.js';
import { upload, handleUpload } from '../middleware/upload.js';

const router = express.Router();

/**
 * @route   POST /api/upload
 * @desc    Upload up to 5 item images (Protected)
 * @access  Private (Authenticated Sellers)
 */
router.post(
  '/',
  protect,
  handleUpload(upload.array('images', 5)),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          message: 'No images were uploaded. Please select at least one item image.'
        });
      }

      // Map uploaded files to relative URLs
      const urls = req.files.map((file) => `/uploads/${file.filename}`);

      return res.status(200).json({
        message: 'Images uploaded successfully.',
        urls,
        primaryUrl: urls[0],
        count: urls.length,
        files: req.files.map((f) => ({
          filename: f.filename,
          size: f.size,
          mimetype: f.mimetype,
          url: `/uploads/${f.filename}`
        }))
      });
    } catch (err) {
      console.error('[Upload Error]:', err);
      return res.status(500).json({ message: 'Server error processing file uploads: ' + err.message });
    }
  }
);

/**
 * @route   POST /api/upload/single
 * @desc    Upload a single item image
 * @access  Private
 */
router.post(
  '/single',
  protect,
  handleUpload(upload.single('image')),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image was uploaded.' });
      }

      const url = `/uploads/${req.file.filename}`;
      return res.status(200).json({
        message: 'Image uploaded successfully.',
        url,
        file: {
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url
        }
      });
    } catch (err) {
      console.error('[Single Upload Error]:', err);
      return res.status(500).json({ message: 'Server error processing upload: ' + err.message });
    }
  }
);

export default router;
