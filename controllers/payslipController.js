const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// ── Validate and sanitize numeric payslip fields ───────────────────────────
function sanitizePayslipNumbers(data) {
    const fields = [
        'basic_pay', 'late_absences', 'pagibig_mp1', 'pagibig_mp2',
        'pagibig_mpl', 'pagibig_calamity', 'sss', 'philhealth',
        'tax', 'disallowances'
    ];
    const clean = {};
    for (const field of fields) {
        const val = parseFloat(data[field]);
        // Reject negative numbers and non-numeric values
        if (isNaN(val) || val < 0) {
            clean[field] = 0;
        } else {
            clean[field] = val;
        }
    }
    return clean;
}

exports.showCreateForm = (req, res) => {
    Employee.getAll((err, employees) => {
        if (err) return res.status(500).send('Error loading employees.');
        res.render('payslipCreate', { employees, nonce: res.locals.nonce });
    });
};

exports.createPayslip = (req, res) => {
    const employee_id = parseInt(req.body.employee_id, 10);
    if (isNaN(employee_id) || employee_id <= 0)
        return res.status(400).send('Invalid employee.');

    const { month, cutoff } = req.body;
    if (!month || !['FIRST_HALF', 'SECOND_HALF'].includes(cutoff))
        return res.status(400).send('Invalid month or cutoff.');

    const nums = sanitizePayslipNumbers(req.body);

    const totalDeductions = nums.late_absences + nums.pagibig_mp1 + nums.pagibig_mp2 +
        nums.pagibig_mpl + nums.pagibig_calamity + nums.sss +
        nums.philhealth + nums.tax + nums.disallowances;

    const netPay = nums.basic_pay - totalDeductions;

    const payslipData = {
        employee_id,
        month,
        cutoff,
        ...nums,
        totalDeductions,
        netPay
    };

    Payslip.create(payslipData, (err) => {
        if (err) {
            console.error('createPayslip error:', err);
            return res.status(500).send('Failed to create payslip.');
        }
        res.redirect('/payslip/list');
    });
};

exports.listPayslips = (req, res) => {
    Payslip.getAll((err, payslips) => {
        if (err) return res.status(500).send('Error fetching payslips.');
        res.render('payslipList', { payslips, nonce: res.locals.nonce });
    });
};

exports.viewPayslip = (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return res.status(400).send('Invalid ID.');

    const sessionEmployee = req.session.employee;

    Payslip.findById(id, (err, result) => {
        if (err || !result || result.length === 0)
            return res.status(404).send('Payslip not found.');

        const row = result[0];

        // FIX: IDOR — non-HR employees can only view their own payslips
        const hrDepts = ['HR', 'HRMU', 'Finance and Administrative Section (FAS)'];
        if (!hrDepts.includes(sessionEmployee.department) &&
            row.employee_id !== sessionEmployee.id) {
            return res.status(403).send('Access denied.');
        }

        const employee = {
            ...row,
            name: row.employee_name || '',
            account_no: row.account_no || ''
        };

        res.render('payslip', {
            employee,
            month: row.month,
            cutoff: row.cutoff,
            totalDeductions: row.totalDeductions,
            netPay: row.netPay,
            images: {
                headerGraphic: '/images/uhi.png',
                lho: '/images/bp.png',
                bfar: '/images/dabfar.png'
            },
            pdf: false,
            nonce: res.locals.nonce
        });
    });
};

exports.printPayslip = (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return res.status(400).send('Invalid ID.');

    const sessionEmployee = req.session.employee;

    Payslip.findById(id, (err, result) => {
        if (err || !result || result.length === 0)
            return res.status(404).send('Payslip not found.');

        const row = result[0];

        // FIX: IDOR check on print too
        const hrDepts = ['HR', 'HRMU', 'Finance and Administrative Section (FAS)'];
        if (!hrDepts.includes(sessionEmployee.department) &&
            row.employee_id !== sessionEmployee.id) {
            return res.status(403).send('Access denied.');
        }

        const payslip = {
            ...row,
            employee_name: row.employee_name || '',
            account_no: row.account_no || ''
        };

        res.render('payslipPrint', {
            payslip,
            images: {
                headerGraphic: '/images/uhi.png',
                lho: '/images/bp.png',
                bfar: '/images/dabfar.png'
            },
            nonce: res.locals.nonce
        });
    });
};

exports.myPayslips = (req, res) => {
    const userId = req.session.employee.id;

    Payslip.getByEmployeeId(userId, (err, payslips) => {
        if (err) return res.status(500).send('Error fetching payslips.');
        res.render('myPayslips', { payslips, nonce: res.locals.nonce });
    });
};

exports.sendEmail = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return res.status(400).send('Invalid ID.');

    Payslip.findById(id, async (err, result) => {
        if (err || !result || result.length === 0)
            return res.status(404).send('Payslip not found.');

        const payslip = result[0];

        if (!payslip.email) return res.status(400).send('Employee has no email address.');

        try {
            const toBase64 = (imgPath) =>
                'data:image/png;base64,' +
                fs.readFileSync(path.join(__dirname, '../public', imgPath)).toString('base64');

            const images = {
                headerGraphic: toBase64('/images/uhi.png'),
                lho: toBase64('/images/bp.png'),
                bfar: toBase64('/images/dabfar.png')
            };

            const html = await new Promise((resolve, reject) => {
                req.app.render('payslipPrint', { payslip, images, nonce: '' }, (err, html) => {
                    if (err) return reject(err);
                    resolve(html);
                });
            });

            const pdfPath = path.join(__dirname, `../temp/payslip_${id}.pdf`);

            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                margin: { top: '40px', bottom: '40px', left: '20px', right: '20px' }
            });
            await browser.close();

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });

            await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: payslip.email,
                subject: `Payslip ${payslip.month}`,
                text: `Greetings! ${payslip.employee_name},\n\nPlease find attached your payslip for ${payslip.month}.\n\nThis is an automated message. Please do not reply.`,
                html: `
                    <div style="font-family:Arial,sans-serif;font-size:14px;color:#222;">
                        <p>Dear <strong>${payslip.employee_name}</strong>,</p>
                        <p>Please find attached your payslip. For concerns, please contact HRMU.</p>
                        <p>Thank you.</p>
                        <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;"/>
                        <p style="font-size:12px;color:#555;">Automated email — please do not reply.</p>
                    </div>
                `,
                attachments: [{ filename: `Payslip_${payslip.month}.pdf`, path: pdfPath }]
            });

            fs.unlinkSync(pdfPath);
            res.send('Payslip sent successfully.');

        } catch (error) {
            console.error('sendEmail error:', error);
            res.status(500).send('Email sending failed.');
        }
    });
};