const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const applicationController = require('../controllers/applicationController');

router.get('/applications', applicationController.listApplications);
router.patch('/applications/:id/approve', applicationController.approveApplication);
router.patch('/applications/:id/reject', applicationController.rejectApplication);

router.get('/users', adminController.listUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:id', adminController.updateUser);

module.exports = router;
