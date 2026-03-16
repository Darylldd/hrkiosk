const Passlip = require('../models/Passlip');

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

    Passlip.generateNextSeq(type, (err, result) => {
        if (err) return res.status(500).send('Error generating passlip number.');

        Passlip.findByType(type, (err, records) => {
            if (err) records = [];

            res.render('passlip', {
                type,
                today: filingDate,
                filingLabel,
                previewNo: result.passlipNo,
                employee: req.session.employee,
                msg: null,
                msgType: 'success',
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
    const employee_id = req.session.employee.id;

    if (!['regular', 'jocos'].includes(type)) return res.status(400).send('Invalid passlip type.');

    // Basic length checks
    if (!department?.trim() || !office_visit?.trim() || !purpose?.trim()) {
        return Passlip.findByType(type, (err, records) => {
            res.render('passlip', {
                type, today: filingDate, filingLabel,
                previewNo: '', employee: req.session.employee,
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
            return Passlip.findByType(type, (err, records) => {
                res.render('passlip', {
                    type, today: filingDate, filingLabel,
                    previewNo: '', employee: req.session.employee,
                    msg: `🚫 You already have a passlip filed for <strong>${filingDate}</strong>. Only one passlip is allowed per day.`,
                    msgType: 'error', records: records || [], office_visit: office_visit || ''
                });
            });
        }

        // FIX: generate passlip_no server-side, never trust req.body for this
        Passlip.generateNextSeq(type, (err, result) => {
            if (err) return res.status(500).send('Error generating passlip number.');

            const data = {
                type,
                seq_no:      result.nextSeq,
                passlip_no:  result.passlipNo, 
                employee_id,
                pass_date:   filingDate,
                department:  department.trim(),
                office_visit: office_visit.trim(),
                purpose:     purpose.trim()
            };

            Passlip.insertPasslip(data, (err) => {
                if (err) {
                    console.error('insertPasslip error:', err);
                    return res.status(500).send('Error saving passlip.');
                }

                Passlip.findByType(type, (err, records) => {
                    res.render('passlip', {
                        type, today: filingDate, filingLabel,
                        previewNo: result.passlipNo,
                        employee: req.session.employee,
                        msg: `✅ Passlip submitted! No: ${result.passlipNo} — Dated: ${filingDate}`,
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

    Passlip.findByType(type, (err, records) => {
        if (err) return res.status(500).send('Error fetching passlips.');
        res.render('passlipRecords', { type, records, employee: req.session.employee });
    });
};

exports.printPasslip = (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return res.status(400).send('Invalid ID.');

    Passlip.findById(id, (err, results) => {
        if (err || !results.length) return res.status(404).send('Passlip not found.');

        // FIX: pass nonce so passlipPrint.ejs can use it on its script tag
        res.render('passlipPrint', { passlip: results[0], nonce: res.locals.nonce });
    });
};