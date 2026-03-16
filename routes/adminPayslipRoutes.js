const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminPayslipController');
const { isAuthenticated, onlyHR } = require('../middleware/authMiddleware');

router.get('/create',         isAuthenticated, onlyHR, ctrl.showCreateForm);
router.post('/preview',       isAuthenticated, onlyHR, ctrl.previewPayslip);
router.post('/save',          isAuthenticated, onlyHR, ctrl.savePayslip);
router.get('/list',           isAuthenticated, onlyHR, ctrl.listPayslips);

// FIX: were completely unauthenticated
router.get('/:id/view',       isAuthenticated, ctrl.viewPayslip);
router.get('/:id/print',      isAuthenticated, ctrl.printPayslip);

router.get('/:id/send-email', isAuthenticated, onlyHR, ctrl.sendEmail);
router.post('/:id/delete',    isAuthenticated, onlyHR, ctrl.deletePayslip);

module.exports = router;