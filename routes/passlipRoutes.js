const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/passlipController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/form',    isAuthenticated, controller.showPasslipForm);
router.post('/form',   isAuthenticated, controller.submitPasslip);
router.get('/',        isAuthenticated, controller.showPasslipRecords);
router.post('/print',  isAuthenticated, controller.printPasslip);

module.exports = router;