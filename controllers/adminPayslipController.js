const AdminPayslip = require('../models/AdminPayslip');
const Employee = require('../models/Employee');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

function n(val) {
    const num = Number(val);
    // FIX: reject negatives — no deduction or salary should be negative
    return (!isNaN(num) && num >= 0) ? num : 0;
}

function computeTotals(data) {
    const pera = 2000;
    const monthly_salary = n(data.monthly_salary);
    const total_gross = monthly_salary + pera;

    const fixedKeys = [
        'gsis_per_share','medicare','pagibig','withholding_tax',
        'provident_403','gsis_emerg_337','gsis_mpl_346','hdmf_mpl_440',
        'islai_premium','islai_loan','hdmf_cal','ucpb_loan',
        'islai_emergency','gsis_cpl','gsis_mpl_lite','ucpb_kasama_salary',
        'gsis_policy_regular','palda_capital_share','palda_coopbank_share',
        'bfar_coop_additional','palda_regular'
    ];
    const fixedTotal = fixedKeys.reduce((sum, k) => sum + n(data[k]), 0);

    const names   = [].concat(data['deduction_name[]']  || []);
    const amounts = [].concat(data['deduction_amount[]'] || []);
    const other_deductions = names
        .map((name, i) => ({ name: String(name).trim().slice(0, 100), amount: n(amounts[i]) }))
        .filter(d => d.name);

    const otherTotal = other_deductions.reduce((sum, d) => sum + d.amount, 0);
    const total_deductions = fixedTotal + otherTotal;
    const net_pay = total_gross - total_deductions;

    return { pera, total_gross, total_deductions, net_pay, other_deductions };
}

// ── Validate ID param ──────────────────────────────────────────────────────
function validId(val) {
    const id = parseInt(val, 10);
    return (!isNaN(id) && id > 0) ? id : null;
}

exports.showCreateForm = (req, res) => {
    const employeeId = validId(req.query.employee_id);

    if (employeeId) {
        Employee.getById(employeeId, (err, rows) => {
            const employee = rows?.[0] || null;
            if (!employee) return res.status(404).send('Employee not found.');
            res.render('adminPayslipCreate', { employee, nonce: res.locals.nonce });
        });
    } else {
        Employee.getAll((err, employees) => {
            if (err) return res.status(500).send('Error loading employees.');
            res.render('adminPayslipSelect', { employees, nonce: res.locals.nonce });
        });
    }
};

exports.previewPayslip = (req, res) => {
    const data = req.body;

    // FIX: validate employee_id before querying
    const employeeId = validId(data.employee_id);
    if (!employeeId) return res.status(400).send('Invalid employee.');

    if (!data.month || !data.year) return res.status(400).send('Month and year are required.');

    const { pera, total_gross, total_deductions, net_pay, other_deductions } = computeTotals(data);

    Employee.getById(employeeId, (err, rows) => {
        if (err || !rows?.[0]) return res.status(404).send('Employee not found.');
        res.render('adminPayslipPreview', {
            data,
            employee: rows[0],
            pera, total_gross, total_deductions, net_pay, other_deductions,
            nonce: res.locals.nonce
        });
    });
};

exports.savePayslip = (req, res) => {
    const data = req.body;

    const employeeId = validId(data.employee_id);
    if (!employeeId) return res.status(400).send('Invalid employee.');
    if (!data.month || !data.year) return res.status(400).send('Month and year are required.');

    const { pera, total_gross, total_deductions, net_pay, other_deductions } = computeTotals(data);

    const payslipData = {
        employee_id:          employeeId,
        month:                data.month,
        year:                 parseInt(data.year, 10),
        division:             String(data.division || '').slice(0, 100),
        section:              String(data.section  || '').slice(0, 100),
        monthly_salary:       n(data.monthly_salary),
        pera,
        gsis_per_share:       n(data.gsis_per_share),
        medicare:             n(data.medicare),
        pagibig:              n(data.pagibig),
        withholding_tax:      n(data.withholding_tax),
        provident_403:        n(data.provident_403),
        gsis_emerg_337:       n(data.gsis_emerg_337),
        gsis_mpl_346:         n(data.gsis_mpl_346),
        hdmf_mpl_440:         n(data.hdmf_mpl_440),
        islai_premium:        n(data.islai_premium),
        islai_loan:           n(data.islai_loan),
        hdmf_cal:             n(data.hdmf_cal),
        ucpb_loan:            n(data.ucpb_loan),
        islai_emergency:      n(data.islai_emergency),
        gsis_cpl:             n(data.gsis_cpl),
        gsis_mpl_lite:        n(data.gsis_mpl_lite),
        ucpb_kasama_salary:   n(data.ucpb_kasama_salary),
        gsis_policy_regular:  n(data.gsis_policy_regular),
        palda_capital_share:  n(data.palda_capital_share),
        palda_coopbank_share: n(data.palda_coopbank_share),
        bfar_coop_additional: n(data.bfar_coop_additional),
        palda_regular:        n(data.palda_regular),
        other_deductions,
        total_gross, total_deductions, net_pay,
        first_period:         n(data.first_period),
        second_period:        n(data.second_period)
    };

    AdminPayslip.create(payslipData, (err, result) => {
        if (err) {
            console.error('savePayslip error:', err);
            return res.status(500).send('Failed to save payslip.');
        }
        res.redirect(`/admin/payslip/${result.insertId}/view`);
    });
};

exports.viewPayslip = (req, res) => {
    const id = validId(req.params.id);
    if (!id) return res.status(400).send('Invalid ID.');

    AdminPayslip.findById(id, (err, rows) => {
        if (err || !rows?.[0]) return res.status(404).send('Payslip not found.');
        const row = rows[0];
        row.other_deductions = typeof row.other_deductions === 'string'
            ? JSON.parse(row.other_deductions)
            : (row.other_deductions || []);

        res.render('adminPayslipView', {
            payslip: row,
            nonce: res.locals.nonce
        });
    });
};

exports.listPayslips = (req, res) => {
    AdminPayslip.getAll((err, payslips) => {
        if (err) return res.status(500).send('Error fetching payslips.');
        res.render('adminPayslipList', { payslips, nonce: res.locals.nonce });
    });
};

exports.printPayslip = (req, res) => {
    const id = validId(req.params.id);
    if (!id) return res.status(400).send('Invalid ID.');

    AdminPayslip.findById(id, (err, rows) => {
        if (err || !rows?.[0]) return res.status(404).send('Payslip not found.');
        const row = rows[0];
        row.other_deductions = typeof row.other_deductions === 'string'
            ? JSON.parse(row.other_deductions)
            : (row.other_deductions || []);

        res.render('adminPayslipPrint', {
            payslip: row,
            images: {
                headerGraphic: '/images/uhi.png',
                lho: '/images/lho.png',
                bfar: '/images/ggggg.jpg'
            },
            nonce: res.locals.nonce
        });
    });
};

exports.deletePayslip = (req, res) => {
    const id = validId(req.params.id);
    if (!id) return res.status(400).send('Invalid ID.');

    AdminPayslip.deleteById(id, (err) => {
        if (err) {
            console.error('deletePayslip error:', err);
            return res.status(500).send('Failed to delete.');
        }
        res.redirect('/admin/payslip/list');
    });
};

exports.sendEmail = async (req, res) => {
    const id = validId(req.params.id);
    if (!id) return res.status(400).send('Invalid ID.');

    AdminPayslip.findById(id, async (err, rows) => {
        if (err || !rows?.[0]) return res.status(404).send('Payslip not found.');

        const payslip = rows[0];
        payslip.other_deductions = typeof payslip.other_deductions === 'string'
            ? JSON.parse(payslip.other_deductions)
            : (payslip.other_deductions || []);

        if (!payslip.email) return res.status(400).send('Employee has no email address.');

        try {
            const toBase64 = (imgPath) =>
                'data:image/png;base64,' +
                fs.readFileSync(path.join(__dirname, '../public', imgPath)).toString('base64');

            const images = {
                headerGraphic: toBase64('/images/uhi.png'),
                lho:           toBase64('/images/lho.png'),
                bfar:          toBase64('/images/ggggg.jpg')
            };

            const html = await new Promise((resolve, reject) => {
                req.app.render('adminPayslipPrint', { payslip, images, nonce: '' }, (e, h) => {
                    if (e) return reject(e);
                    resolve(h);
                });
            });

            const pdfPath = path.join(__dirname, `../temp/adminpayslip_${id}.pdf`);
            const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            await page.pdf({
                path: pdfPath, format: 'A4', printBackground: true,
                margin: { top: '30px', bottom: '30px', left: '20px', right: '20px' }
            });
            await browser.close();

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });

            await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: payslip.email,
                subject: `Payslip – ${payslip.month} ${payslip.year}`,
                html: `
                    <div style="font-family:Arial,sans-serif;font-size:14px;color:#222;">
                        <p>Dear <strong>${payslip.employee_name}</strong>,</p>
                        <p>Please find attached your payslip for <strong>${payslip.month} ${payslip.year}</strong>.</p>
                        <p>For concerns, please contact the HR office.</p>
                        <p>Thank you.</p>
                        <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
                        <p style="font-size:12px;color:#888;">Automated email — please do not reply.</p>
                    </div>
                `,
                attachments: [{ filename: `Payslip_${payslip.month}_${payslip.year}.pdf`, path: pdfPath }]
            });

            fs.unlinkSync(pdfPath);
            res.send('Payslip sent successfully.');

        } catch (e) {
            console.error('sendEmail error:', e);
            res.status(500).send('Email sending failed.');
        }
    });
};