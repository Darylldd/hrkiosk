const AdminPayslip = require('../models/AdminPayslip');
const Employee     = require('../models/Employee');
const AuditLog     = require('../models/AuditLog');
const nodemailer   = require('nodemailer');
const puppeteer    = require('puppeteer');
const path = require('path');
const fs   = require('fs');

function n(val) {
    const num = Number(val);
    return (!isNaN(num) && num >= 0) ? num : 0;
}

function computeTotals(data) {
    const pera           = 2000;
    const monthly_salary = n(data.monthly_salary);
    const total_gross    = monthly_salary + pera;

    const fixedKeys = [
        'gsis_per_share', 'medicare', 'pagibig', 'withholding_tax',
        'provident_403', 'gsis_emerg_337', 'gsis_mpl_346', 'hdmf_mpl_440',
        'islai_premium', 'islai_loan', 'hdmf_cal', 'ucpb_loan',
        'islai_emergency', 'gsis_cpl', 'gsis_mpl_lite', 'ucpb_kasama_salary',
        'gsis_policy_regular', 'palda_capital_share', 'palda_coopbank_share',
        'bfar_coop_additional', 'palda_regular',
    ];
    const fixedTotal = fixedKeys.reduce((sum, k) => sum + n(data[k]), 0);

    const names   = [].concat(data['deduction_name[]']   || []);
    const amounts = [].concat(data['deduction_amount[]'] || []);
    const other_deductions = names
        .map((name, i) => ({ name: String(name).trim().slice(0, 100), amount: n(amounts[i]) }))
        .filter(d => d.name);

    const otherTotal       = other_deductions.reduce((sum, d) => sum + d.amount, 0);
    const total_deductions = fixedTotal + otherTotal;
    const net_pay          = total_gross - total_deductions;

    return { pera, total_gross, total_deductions, net_pay, other_deductions };
}

function validId(val) {
    const id = parseInt(val, 10);
    return (!isNaN(id) && id > 0) ? id : null;
}

// Build a URL-safe, human-readable ref
// Format: 2024-March-EMP00042
function makeRef(employee_no, month, year) {
    const safeEmpNo = (employee_no || 'UNK').replace(/[^A-Za-z0-9_-]/g, '_');
    return `${year}-${month}-${safeEmpNo}`;
}

// ── Create / select form ───────────────────────────────────────────────────
exports.showCreateForm = (req, res) => {
    // Employee was stored in session by the POST select step — no id/no in URL
    const selectedEmpNo = req.session.pending_payslip_emp_no || null;

    if (selectedEmpNo) {
        delete req.session.pending_payslip_emp_no; // consume immediately

        Employee.findByEmployeeNo(selectedEmpNo, (err, rows) => {
            const employee = rows?.[0] || null;
            if (!employee) {
                req.session.flash_error = 'Employee not found.';
                return res.redirect('/admin/payslip/create');
            }
            res.render('adminPayslipCreate', { employee, nonce: res.locals.nonce });
        });
    } else {
        Employee.getAll((err, employees) => {
            if (err) {
                req.session.flash_error = 'Error loading employees. Please try again.';
                return res.redirect('/dashboard');
            }
            res.render('adminPayslipSelect', { employees, nonce: res.locals.nonce });
        });
    }
};

// ── Receive the employee selection via POST — stores in session, no id in URL
exports.selectEmployee = (req, res) => {
    const employeeNo = (req.body.employee_no || '').trim();
    if (!employeeNo) {
        req.session.flash_error = 'Please select an employee.';
        return res.redirect('/admin/payslip/create');
    }
    // Validate it actually exists before storing
    Employee.findByEmployeeNo(employeeNo, (err, rows) => {
        if (err || !rows?.[0]) {
            req.session.flash_error = 'Employee not found.';
            return res.redirect('/admin/payslip/create');
        }
        req.session.pending_payslip_emp_no = employeeNo;
        // Clean URL — no employee identifier visible
        res.redirect('/admin/payslip/create');
    });
};

// ── Preview ────────────────────────────────────────────────────────────────
exports.previewPayslip = (req, res) => {
    const data       = req.body;
    const employeeId = validId(data.employee_id);

    if (!employeeId) {
        req.session.flash_error = 'Invalid employee selected.';
        return res.redirect('/admin/payslip/create');
    }
    if (!data.month || !data.year) {
        req.session.flash_error = 'Month and year are required.';
        return res.redirect('/admin/payslip/create');
    }

    const { pera, total_gross, total_deductions, net_pay, other_deductions } = computeTotals(data);

    Employee.getById(employeeId, (err, rows) => {
        if (err || !rows?.[0]) {
            req.session.flash_error = 'Employee not found.';
            return res.redirect('/admin/payslip/create');
        }
        res.render('adminPayslipPreview', {
            data,
            employee: rows[0],
            pera, total_gross, total_deductions, net_pay, other_deductions,
            nonce: res.locals.nonce,
        });
    });
};

// ── Save ───────────────────────────────────────────────────────────────────
exports.savePayslip = (req, res) => {
    const data       = req.body;
    const employeeId = validId(data.employee_id);

    if (!employeeId) {
        req.session.flash_error = 'Invalid employee selected.';
        return res.redirect('/admin/payslip/create');
    }
    if (!data.month || !data.year) {
        req.session.flash_error = 'Month and year are required.';
        return res.redirect('/admin/payslip/create');
    }

    // Fetch employee_no to build a meaningful ref
    Employee.getById(employeeId, (err, empRows) => {
        if (err || !empRows?.[0]) {
            req.session.flash_error = 'Employee not found.';
            return res.redirect('/admin/payslip/create');
        }

        const emp                  = empRows[0];
        const admin_payslip_ref    = makeRef(emp.employee_no, data.month, data.year);
        const { pera, total_gross, total_deductions, net_pay, other_deductions } = computeTotals(data);

        const payslipData = {
            admin_payslip_ref,
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
            first_period:  n(data.first_period),
            second_period: n(data.second_period),
        };

        AdminPayslip.create(payslipData, (err) => {
            if (err) {
                console.error('savePayslip error:', err);
                req.session.flash_error = 'Failed to save payslip. Please try again.';
                return res.redirect('/admin/payslip/create');
            }

            const actor = req.session.employee;
            AuditLog.log({
                employee_id:   actor.id,
                employee_name: `${actor.first_name} ${actor.last_name}`,
                action:        'CREATE_ADMIN_PAYSLIP',
                details:       `${admin_payslip_ref} · ${emp.first_name} ${emp.last_name} · Net: ${net_pay.toFixed(2)}`,
                ip_address:    req.ip,
            });

            req.session.flash_success = 'Payslip saved successfully.';
            // Redirect to list — view is now POST-only so we can't redirect directly to it
            res.redirect('/admin/payslip/list');
        });
    });
};

// ── View via POST — ref in request body, nothing in the URL ───────────────
exports.viewPayslip = (req, res) => {
    const ref = (req.body.ref || '').trim();
    if (!ref) {
        req.session.flash_error = 'Invalid payslip reference.';
        return res.redirect('/admin/payslip/list');
    }

    AdminPayslip.findByRef(ref, (err, rows) => {
        if (err || !rows?.[0]) {
            req.session.flash_error = 'Payslip not found.';
            return res.redirect('/admin/payslip/list');
        }
        const row = rows[0];
        row.other_deductions = typeof row.other_deductions === 'string'
            ? JSON.parse(row.other_deductions)
            : (row.other_deductions || []);

        const flash_success = req.session.flash_success || null;
        const flash_error   = req.session.flash_error   || null;
        delete req.session.flash_success;
        delete req.session.flash_error;

        res.render('adminPayslipView', {
            payslip: row,
            flash_success,
            flash_error,
            nonce: res.locals.nonce,
        });
    });
};

// ── List ───────────────────────────────────────────────────────────────────
exports.listPayslips = (req, res) => {
    const flash_success = req.session.flash_success || null;
    const flash_error   = req.session.flash_error   || null;
    delete req.session.flash_success;
    delete req.session.flash_error;

    AdminPayslip.getAll((err, payslips) => {
        if (err) {
            req.session.flash_error = 'Error fetching payslips. Please try again.';
            return res.redirect('/dashboard');
        }
        res.render('adminPayslipList', { payslips, flash_success, flash_error, nonce: res.locals.nonce });
    });
};

// ── Print via POST — ref in request body, nothing in the URL ──────────────
exports.printPayslip = (req, res) => {
    const ref = (req.body.ref || '').trim();
    if (!ref) return res.status(400).send('Invalid payslip reference.');

    AdminPayslip.findByRef(ref, (err, rows) => {
        if (err || !rows?.[0]) return res.status(404).send('Payslip not found.');

        const row = rows[0];
        row.other_deductions = typeof row.other_deductions === 'string'
            ? JSON.parse(row.other_deductions)
            : (row.other_deductions || []);

        AuditLog.log({
            employee_id:   req.session.employee.id,
            employee_name: `${req.session.employee.first_name} ${req.session.employee.last_name}`,
            action:        'PRINT_ADMIN_PAYSLIP',
            details:       `${ref}`,
            ip_address:    req.ip,
        });

        res.render('adminPayslipPrint', {
            payslip: row,
            images: {
                headerGraphic: '/images/uhi.png',
                lho:  '/images/lho.png',
                bfar: '/images/ggggg.jpg',
            },
            nonce: res.locals.nonce,
        });
    });
};

// ── Delete — uses numeric id (HR-only, form POST) ─────────────────────────
exports.deletePayslip = (req, res) => {
    const id = validId(req.params.id);
    if (!id) {
        req.session.flash_error = 'Invalid ID.';
        return res.redirect('/admin/payslip/list');
    }

    AdminPayslip.deleteById(id, (err) => {
        if (err) {
            console.error('deletePayslip error:', err);
            req.session.flash_error = 'Failed to delete payslip. Please try again.';
        } else {
            const actor = req.session.employee;
            AuditLog.log({
                employee_id:   actor.id,
                employee_name: `${actor.first_name} ${actor.last_name}`,
                action:        'DELETE_ADMIN_PAYSLIP',
                details:       `DB id: ${id}`,
                ip_address:    req.ip,
            });
            req.session.flash_success = 'Payslip deleted successfully.';
        }
        res.redirect('/admin/payslip/list');
    });
};

// ── Send email — uses numeric id (HR-only, fetch() call) ──────────────────
exports.sendEmail = async (req, res) => {
    const id = validId(req.params.id);
    if (!id) return res.status(400).send('Invalid ID.');

    AdminPayslip.findById(id, async (err, rows) => {
        if (err || !rows?.[0]) return res.status(404).send('Payslip not found.');

        const payslip = rows[0];
        payslip.other_deductions = typeof payslip.other_deductions === 'string'
            ? JSON.parse(payslip.other_deductions)
            : (payslip.other_deductions || []);

        if (!payslip.email) return res.status(400).send('Employee has no email address on file.');

        try {
            const toBase64 = (imgPath) =>
                'data:image/png;base64,' +
                fs.readFileSync(path.join(__dirname, '../public', imgPath)).toString('base64');

            const images = {
                headerGraphic: toBase64('/images/uhi.png'),
                lho:           toBase64('/images/lho.png'),
                bfar:          toBase64('/images/ggggg.jpg'),
            };

            const html = await new Promise((resolve, reject) => {
                req.app.render('adminPayslipPrint', { payslip, images, nonce: '' }, (e, h) => {
                    if (e) return reject(e);
                    resolve(h);
                });
            });

            const pdfPath = path.join(__dirname, `../temp/adminpayslip_${id}.pdf`);
            const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
            const page    = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            await page.pdf({
                path: pdfPath, format: 'A4', printBackground: true,
                margin: { top: '30px', bottom: '30px', left: '20px', right: '20px' },
            });
            await browser.close();

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
            });

            await transporter.sendMail({
                from:    process.env.EMAIL_FROM,
                to:      payslip.email,
                subject: `Payslip – ${payslip.month} ${payslip.year}`,
                html: `
                    <div style="font-family:Arial,sans-serif;font-size:14px;color:#222;">
                        <p>Dear <strong>${payslip.employee_name}</strong>,</p>
                        <p>Please find attached your payslip for <strong>${payslip.month} ${payslip.year}</strong>.</p>
                        <p>For concerns, please contact the HR office.</p>
                        <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
                        <p style="font-size:12px;color:#888;">Automated email — please do not reply.</p>
                    </div>
                `,
                attachments: [{ filename: `Payslip_${payslip.month}_${payslip.year}.pdf`, path: pdfPath }],
            });

            fs.unlinkSync(pdfPath);

            const actor = req.session.employee;
            AuditLog.log({
                employee_id:   actor.id,
                employee_name: `${actor.first_name} ${actor.last_name}`,
                action:        'EMAIL_ADMIN_PAYSLIP',
                details:       `${payslip.admin_payslip_ref || id} → ${payslip.email}`,
                ip_address:    req.ip,
            });

            res.send('Payslip sent successfully.');

        } catch (e) {
            console.error('sendEmail error:', e);
            res.status(500).send('Email sending failed. Please try again.');
        }
    });
};