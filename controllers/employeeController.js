const Employee = require('../models/Employee');
const AuditLog  = require('../models/AuditLog');
const argon2    = require('argon2');

// ── Validator ──────────────────────────────────────────────────────────────
function validateEmployeeInput(data) {
    const errors = [];
    if (!data.employee_no?.trim())           errors.push('Employee number is required.');
    if (!data.first_name?.trim())            errors.push('First name is required.');
    if (!data.last_name?.trim())             errors.push('Last name is required.');
    if (!data.pin || data.pin.length < 4)    errors.push('PIN must be at least 4 characters.');

    const maxLen = {
        employee_no: 20, employee_id: 30, first_name: 60,
        last_name: 60, middle_name: 60, email: 100, contact_no: 20,
    };
    for (const [field, max] of Object.entries(maxLen)) {
        if (data[field] && data[field].length > max)
            errors.push(`${field} exceeds maximum length of ${max}.`);
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        errors.push('Invalid email format.');
    return errors;
}

exports.showAddEmployee = (req, res) => res.render('addEmployee');

// ── View by employee_no — no DB id in the URL ─────────────────────────────
exports.viewEmployee = (req, res) => {
    const empNo = (req.params.employee_no || '').trim();
    if (!empNo) return res.status(400).json({ error: 'Invalid employee number.' });

    Employee.findByEmployeeNo(empNo, (err, result) => {
        if (err || !result || result.length === 0)
            return res.status(404).json({ error: 'Employee not found.' });

        const { pin, ...safeData } = result[0];
        res.json(safeData);
    });
};

exports.createEmployee = async (req, res) => {
    try {
        const {
            employee_no, employee_id, account_no, pin,
            first_name, middle_name, last_name,
            department, position, status,
            nature_of_employment, date_hired,
            birthdate, civil_status, sex,
            tin, philhealth_no, gsis_no, sss_no,
            email, contact_no,
            emergency_contact_name, emergency_contact_phone,
        } = req.body;

        const errors = validateEmployeeInput(req.body);
        if (errors.length > 0) return res.status(400).send(errors.join('<br>'));

        const files = req.files || {};

        let profile_pic = null;
        if (req.file?.fieldname === 'profile_pic') {
            profile_pic = '/uploads/profile/' + req.file.filename;
        } else if (files.profile_pic?.[0]) {
            profile_pic = '/uploads/profile/' + files.profile_pic[0].filename;
        }

        let contract_file = null;
        if (files.contract_file?.[0]) {
            contract_file = '/uploads/contracts/' + files.contract_file[0].filename;
        }

        const hashedPin = await argon2.hash(pin, {
            type: argon2.argon2id, memoryCost: 2 ** 16, timeCost: 3, parallelism: 1,
        });

        let date_of_original_appointment = null;
        let date_of_appointment          = null;
        let resolved_date_hired          = null;
        const nature = (nature_of_employment || '').toLowerCase();
        if      (nature === 'permanent') date_of_original_appointment = date_hired;
        else if (nature === 'casual')    date_of_appointment          = date_hired;
        else                             resolved_date_hired           = date_hired;

        const employeeData = {
            employee_no: employee_no.trim(),
            employee_id: employee_id?.trim(),
            account_no:  account_no?.trim(),
            profile_pic,
            pin: hashedPin,
            first_name:  first_name.trim(),
            middle_name: middle_name?.trim(),
            last_name:   last_name.trim(),
            department, position, status,
            nature_of_employment,
            date_hired:                   resolved_date_hired,
            date_of_appointment,
            date_of_original_appointment,
            birthdate, civil_status, sex,
            tin, philhealth_no, gsis_no, sss_no,
            email:       email?.trim().toLowerCase(),
            contact_no,
            emergency_contact_name,
            emergency_contact_phone,
            contract_file,
        };

        Employee.create(employeeData, (err) => {
            if (err) {
                console.error('createEmployee DB error:', err);
                return res.status(500).send('Error saving employee. Please try again.');
            }

            const actor = req.session?.employee;
            AuditLog.log({
                employee_id:   actor?.id,
                employee_name: actor ? `${actor.first_name} ${actor.last_name}` : 'System',
                action:        'CREATE_EMPLOYEE',
                details:       `Added: ${first_name.trim()} ${last_name.trim()} (${employee_no.trim()}) · ${department || ''}`,
                ip_address:    req.ip,
            });

            res.redirect('/employees');
        });

    } catch (err) {
        console.error('createEmployee error:', err);
        res.status(500).send('Server error.');
    }
};

exports.showEmployees = (req, res) => {
    Employee.getAll((err, results) => {
        if (err) return res.status(500).send('Error fetching employees.');
        res.render('employeeList', { employees: results, employee: req.session.employee });
    });
};