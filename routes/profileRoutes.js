const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { isAuthenticated } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, req.session.employee.id + '_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/profile', isAuthenticated, profileController.showProfile);
router.post('/profile', isAuthenticated, upload.single('profile_pic'), profileController.updateProfile);

module.exports = router;