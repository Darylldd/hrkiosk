const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { isAuthenticated } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Ensure upload directories exist ───────────────────────────────────────
const profileDir   = path.join(__dirname, '../public/uploads/profile');
const contractsDir = path.join(__dirname, '../public/uploads/contracts');
if (!fs.existsSync(profileDir))   fs.mkdirSync(profileDir,   { recursive: true });
if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

// ── Allowed MIME types ─────────────────────────────────────────────────────
const IMAGE_TYPES    = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const CONTRACT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

const MAX_PROFILE_SIZE  = 2  * 1024 * 1024;  // 2 MB
const MAX_CONTRACT_SIZE = 10 * 1024 * 1024;  // 10 MB

// ── Storage — route each field to its own subfolder ───────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'contract_file') {
            cb(null, contractsDir);
        } else {
            cb(null, profileDir);
        }
    },
    filename: (req, file, cb) => {
        const empId    = req.session?.employee?.id || 'unknown';
        const ext      = path.extname(file.originalname).toLowerCase();
        const safeName = `${empId}_${Date.now()}${ext}`;
        cb(null, safeName);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'contract_file') {
            if (CONTRACT_TYPES.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Contract must be a PDF, JPEG, PNG, or GIF.'));
            }
        } else {
            if (IMAGE_TYPES.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Profile picture must be a JPEG, PNG, WebP, or GIF.'));
            }
        }
    },
    limits: {
        fileSize: MAX_CONTRACT_SIZE,
    }
});

const uploadFields = upload.fields([
    { name: 'profile_pic',   maxCount: 1 },
    { name: 'contract_file', maxCount: 1 },
]);

router.get('/profile',  isAuthenticated, profileController.showProfile);
router.post('/profile', isAuthenticated, uploadFields, profileController.updateProfile);

module.exports = router;