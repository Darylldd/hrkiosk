const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/authMiddleware');



router.get('/login', authController.showLogin);
router.post('/login', authController.login);

router.get('/dashboard', isAuthenticated, authController.dashboard);

router.get('/logout', authController.logout);

module.exports = router;