const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/auditLogController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/audit-logs', isAuthenticated, controller.showLogs);

module.exports = router;