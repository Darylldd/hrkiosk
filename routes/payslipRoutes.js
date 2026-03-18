const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/payslipController');
const { isAuthenticated, onlyHR } = require('../middleware/authMiddleware');

router.get('/my',                 isAuthenticated,         controller.myPayslips);
router.get('/create',             isAuthenticated, onlyHR, controller.showCreateForm);
router.post('/create',            isAuthenticated, onlyHR, controller.createPayslip);
router.get('/list',               isAuthenticated, onlyHR, controller.listPayslips);
router.get('/send-email/:id',     isAuthenticated, onlyHR, controller.sendEmail);

router.post('/print',             isAuthenticated,         controller.printPayslip);

router.get('/:payslip_ref',       isAuthenticated,         controller.viewPayslip);

module.exports = router;