const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const dtrRoutes = require('./routes/dtrRoutes');
const profileRoutes = require('./routes/profileRoutes');
const toRoutes = require('./routes/travelOrderRoutes');
const adminPayslipRoutes = require('./routes/adminPayslipRoutes');

const app = express();

// ── Nonce FIRST, then helmet can use it ───────────────────────────────────
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

app.use((req, res, next) => {
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", `'nonce-${res.locals.nonce}'`],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"],
            }
        }
    })(req, res, next);
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/login', loginLimiter);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static('public/images'));

app.use(session({
    name: 'sess',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60
    }
}));

app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

app.get('/', (req, res) => res.redirect('/login'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', authRoutes);
app.use('/', dtrRoutes);
app.use('/', profileRoutes);
app.use('/', toRoutes);
app.use('/passlip', require('./routes/passlipRoutes'));
app.use('/payslip', require('./routes/payslipRoutes'));
app.use('/', require('./routes/employeeRoutes'));
app.use('/admin/payslip', adminPayslipRoutes);

app.listen(3000, () => console.log('Server running on http://localhost:3000'));