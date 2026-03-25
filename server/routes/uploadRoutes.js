const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { uploadExcel, importGoogleSheet } = require('../controllers/uploadController');

router.post('/excel', upload.single('file'), uploadExcel);
router.post('/google-sheet', importGoogleSheet);

module.exports = router;
