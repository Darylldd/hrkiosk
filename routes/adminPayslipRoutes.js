const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/adminPayslipController');
const { isAuthenticated, onlyHR } = require('../middleware/authMiddleware');

router.get('/create',           isAuthenticated, onlyHR, ctrl.showCreateForm);
router.post('/select-employee', isAuthenticated, onlyHR, ctrl.selectEmployee);
router.post('/preview',         isAuthenticated, onlyHR, ctrl.previewPayslip);
router.post('/save',            isAuthenticated, onlyHR, ctrl.savePayslip);
router.get('/list',             isAuthenticated, onlyHR, ctrl.listPayslips);

router.post('/view',            isAuthenticated,         ctrl.viewPayslip);
router.post('/print',           isAuthenticated,         ctrl.printPayslip);

router.get('/:id/send-email',   isAuthenticated, onlyHR, ctrl.sendEmail);
router.post('/:id/delete',      isAuthenticated, onlyHR, ctrl.deletePayslip);

module.exports = router;