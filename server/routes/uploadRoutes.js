const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { uploadExcel } = require('../controllers/uploadController');

router.post('/excel', upload.single('file'), uploadExcel);

module.exports = router;
