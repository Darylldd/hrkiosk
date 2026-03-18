const Passlip  = require('../models/Passlip');
const AuditLog = require('../models/AuditLog');

// HR and admin departments that can see all passlip records
const PRIVILEGED_DEPARTMENTS = ['hrmu', 'admin'];

function isPrivileged(employee) {
    return PRIVILEGED_DEPARTMENTS.includes((employee.department || '').toLowerCase());
}

function getFilingDate() {
    const now = new Date();
    if (now.getHours() >= 17) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }
    return now.toISOString().split('T')[0];
}

function getFilingLabel() {
    const now = new Date();
    return now.getHours() >= 17
        ? 'Filing is for TOMORROW (submitted after 5:00 PM cutoff)'
        : 'Filing is for TODAY';
}

exports.showPasslipForm = (req, res) => {
    const type = req.query.type;
    if (!['regular', 'jocos'].includes(type)) return res.status(400).send('Invalid passlip type.');

    const filingDate  = getFilingDate();
    const filingLabel = getFilingLabel();
    const employee    = req.session.employee;
    const employeeId  = isPrivileged(employee) ? null : employee.id;

    Passlip.generateNextSeq(type, (err, result) => {
        if (err) return res.status(500).send('Error generating passlip number.');

        Passlip.findByType(type, employeeId, (err, records) => {
            if (err) records = [];

            res.render('passlip', {
                type,
                today:      filingDate,
                filingLabel,
                previewNo:  result.passlipNo,
                employee,
                msg:        null,
                msgType:    'success',
                records,
                office_visit: ''
            });
        });
    });
};

exports.submitPasslip = (req, res) => {
    const { department, office_visit, purpose } = req.body;
    const type        = req.query.type;
    const filingDate  = getFilingDate();
    const filingLabel = getFilingLabel();
    const employee    = req.session.employee;
    const employee_id = employee.id;
    const employeeId  = isPrivileged(employee) ? null : employee.id;

    if (!['regular', 'jocos'].includes(type)) return res.status(400).send('Invalid passlip type.');

    if (!department?.trim() || !office_visit?.trim() || !purpose?.trim()) {
        return Passlip.findByType(type, employeeId, (err, records) => {
            res.render('passlip', {
                type, today: filingDate, filingLabel,
                previewNo: '', employee,
                msg: '⚠️ Please fill in all required fields.', msgType: 'error',
                records: records || [], office_visit: office_visit || ''
            });
        });
    }

    if (office_visit.length > 200 || purpose.length > 500) {
        return res.status(400).send('Input exceeds maximum allowed length.');
    }

    Passlip.checkExistingForDate(employee_id, filingDate, (err, results) => {
        if (err) return res.status(500).send('Error checking existing passlip.');

        if (results.length > 0) {
            return Passlip.findByType(type, employeeId, (err, records) => {
                res.render('passlip', {
                    type, today: filingDate, filingLabel,
                    previewNo: '', employee,
                    msg: `🚫 You already have a passlip filed for <strong>${filingDate}</strong>. Only one passlip is allowed per day.`,
                    msgType: 'error', records: records || [], office_visit: office_visit || ''
                });
            });
        }

        Passlip.generateNextSeq(type, (err, result) => {
            if (err) return res.status(500).send('Error generating passlip number.');

            const data = {
                type,
                seq_no:       result.nextSeq,
                passlip_no:   result.passlipNo,
                employee_id,
                pass_date:    filingDate,
                department:   department.trim(),
                office_visit: office_visit.trim(),
                purpose:      purpose.trim()
            };

            Passlip.insertPasslip(data, (err) => {
                if (err) {
                    console.error('insertPasslip error:', err);
                    return res.status(500).send('Error saving passlip.');
                }

                // ── Audit log ──
                AuditLog.log({
                    employee_id:   employee.id,
                    employee_name: `${employee.first_name} ${employee.last_name}`,
                    action:        'SUBMIT_PASSLIP',
                    details:       `${result.passlipNo} · ${type === 'regular' ? 'Regular' : 'JO/COS'} · To: ${office_visit.trim()} · ${filingDate}`,
                    ip_address:    req.ip,
                });

                Passlip.findByType(type, employeeId, (err, records) => {
                    res.render('passlip', {
                        type, today: filingDate, filingLabel,
                        previewNo: result.passlipNo,
                        employee,
                        msg:     `✅ Passlip submitted! No: ${result.passlipNo} — Dated: ${filingDate}`,
                        msgType: 'success', records: records || [], office_visit: ''
                    });
                });
            });
        });
    });
};

exports.showPasslipRecords = (req, res) => {
    const type = req.query.type;
    if (!['regular', 'jocos'].includes(type)) return res.status(400).send('Invalid passlip type.');

    const employee   = req.session.employee;
    const employeeId = isPrivileged(employee) ? null : employee.id;

    Passlip.findByType(type, employeeId, (err, records) => {
        if (err) return res.status(500).send('Error fetching passlips.');
        res.render('passlipRecords', { type, records, employee });
    });
};

// ── Print via POST — passlip_no in request body, nothing in the URL ──────
exports.printPasslip = (req, res) => {
    const passlipNo = (req.body.passlip_no || '').trim();
    if (!passlipNo) return res.status(400).send('Invalid passlip number.');

    Passlip.findByPasslipNo(passlipNo, (err, results) => {
        if (err || !results.length) return res.status(404).send('Passlip not found.');
        res.render('passlipPrint', { passlip: results[0], nonce: res.locals.nonce });
    });
};