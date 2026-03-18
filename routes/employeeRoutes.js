const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { onlyHR, isAuthenticated } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Ensure upload directories exist ───────────────────────────────────────
const profileDir   = path.join(__dirname, '../public/uploads/profile');
const contractsDir = path.join(__dirname, '../public/uploads/contracts');
if (!fs.existsSync(profileDir))   fs.mkdirSync(profileDir,   { recursive: true });
if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

// ── Allowed MIME types per field ───────────────────────────────────────────
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
        const ext      = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, safeName);
    }
});

// ── File filter — validate MIME type and size per field ───────────────────
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
            // profile_pic
            if (IMAGE_TYPES.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Profile picture must be a JPEG, PNG, WebP, or GIF.'));
            }
        }
    },
    limits: {
        // multer's global fileSize limit — we enforce per-field limits
        // in the controller after upload, or just use the larger one here
        fileSize: MAX_CONTRACT_SIZE,
    }
});

// ── Accept both fields in one middleware call ─────────────────────────────
const uploadFields = upload.fields([
    { name: 'profile_pic',   maxCount: 1 },
    { name: 'contract_file', maxCount: 1 },
]);

// ── Routes ────────────────────────────────────────────────────────────────
router.get('/employees/add',      onlyHR,          employeeController.showAddEmployee);
router.post('/employees/add',     onlyHR,          uploadFields, employeeController.createEmployee);
router.get('/employees',          onlyHR,          employeeController.showEmployees);
router.get('/employees/:employee_no/view', isAuthenticated, employeeController.viewEmployee);

module.exports = router;