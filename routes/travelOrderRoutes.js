const express = require('express');
const router = express.Router();
const travelOrderController = require('../controllers/travelOrderController');
const { isAuthenticated, onlyHR } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/travel_orders/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'TO_' + Date.now() + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPEG, PNG, and WebP files are allowed.'));
        }
    }
});

router.get('/travel-orders',         isAuthenticated, travelOrderController.showTravelOrders);
router.get('/travel-orders/upload',  isAuthenticated, onlyHR, travelOrderController.showUploadForm);
router.post('/travel-orders/upload', isAuthenticated, onlyHR, upload.single('file'), travelOrderController.uploadTravelOrder);

router.get('/travel-orders/print/:id', isAuthenticated, travelOrderController.printTravelOrder);

module.exports = router;