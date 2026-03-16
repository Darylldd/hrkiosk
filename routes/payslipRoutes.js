const express = require('express');
const router = express.Router();
const payslipController = require('../controllers/payslipController');
const { isAuthenticated, onlyHR } = require('../middleware/authMiddleware');

router.get('/my',              isAuthenticated, payslipController.myPayslips);
router.get('/create',          isAuthenticated, onlyHR, payslipController.showCreateForm);
router.post('/create',         isAuthenticated, onlyHR, payslipController.createPayslip);
router.get('/list',            isAuthenticated, onlyHR, payslipController.listPayslips);
router.get('/send-email/:id',  isAuthenticated, onlyHR, payslipController.sendEmail);
router.get('/:id/print',       isAuthenticated, payslipController.printPayslip);
router.get('/:id',             isAuthenticated, payslipController.viewPayslip);

module.exports = router;