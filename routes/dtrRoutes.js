const express = require('express');
const router = express.Router();
const dtrController = require('../controllers/dtrController');
const { isAuthenticated, onlyAuthorizedDTR } = require('../middleware/authMiddleware');

router.get('/dtr', isAuthenticated, dtrController.showDTR);

router.post('/dtr/clockin', isAuthenticated, dtrController.clockIn);
router.post('/dtr/clockout', isAuthenticated, dtrController.clockOut);

router.get('/admin/dtr', onlyAuthorizedDTR, dtrController.showAllDTR);

module.exports = router;