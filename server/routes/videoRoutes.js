const express = require('express');
const router = express.Router();
const {
  getVideoById,
  getVideos,
  addVideo,
  addBulkVideos,
  deleteVideo,
  updateVideo,
  updateStatus,
} = require('../controllers/videoController');

router.get('/', getVideos);
router.post('/', addVideo);
router.post('/bulk', addBulkVideos);
router.get('/:id', getVideoById);
router.delete('/:id', deleteVideo);
router.patch('/:id/status', updateStatus);
router.patch('/:id', updateVideo);

module.exports = router;
