const express = require('express');
const router = express.Router();
const debug = require('../controllers/debugController');

router.get('/creators', debug.getCreatorStatus);
router.post('/preview-creator', debug.previewCreator);

module.exports = router;
