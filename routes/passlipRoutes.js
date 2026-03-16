const express = require('express');
const router = express.Router();
const passlipController = require('../controllers/passlipController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/form',      isAuthenticated, passlipController.showPasslipForm);
router.post('/form',     isAuthenticated, passlipController.submitPasslip);
router.get('/',          isAuthenticated, passlipController.showPasslipRecords);
router.get('/print/:id', isAuthenticated, passlipController.printPasslip);

module.exports = router;