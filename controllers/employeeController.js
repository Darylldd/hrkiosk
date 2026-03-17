const Employee = require('../models/Employee');
const argon2 = require('argon2');

// ── Simple server-side validator ───────────────────────────────────────────
function validateEmployeeInput(data) {
    const errors = [];

    if (!data.employee_no?.trim())  errors.push('Employee number is required.');
    if (!data.first_name?.trim())   errors.push('First name is required.');
    if (!data.last_name?.trim())    errors.push('Last name is required.');
    if (!data.pin || data.pin.length < 4) errors.push('PIN must be at least 4 characters.');

    // Prevent oversized strings reaching the DB
    const maxLen = { employee_no: 20, employee_id: 30, first_name: 60,
                     last_name: 60, middle_name: 60, email: 100, contact_no: 20 };
    for (const [field, max] of Object.entries(maxLen)) {
        if (data[field] && data[field].length > max)
            errors.push(`${field} exceeds maximum length of ${max}.`);
    }

    // Basic email format check
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        errors.push('Invalid email format.');

    return errors;
}

exports.showAddEmployee = (req, res) => res.render('addEmployee');

exports.viewEmployee = (req, res) => {
    const id = parseInt(req.params.id, 10);

    // Reject non-numeric IDs immediately (prevents type-juggling tricks)
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID.' });

    Employee.getById(id, (err, result) => {
        if (err || !result || result.length === 0)
            return res.status(404).json({ error: 'Employee not found.' });

        // FIX: never send the PIN hash to the client
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
            emergency_contact_name, emergency_contact_phone
        } = req.body;

        // ── Server-side validation (inspect-element bypasses client validation) ──
        const errors = validateEmployeeInput(req.body);
        if (errors.length > 0)
            return res.status(400).send(errors.join('<br>'));

        let profile_pic = req.file?.filename || null;

        const hashedPin = await argon2.hash(pin, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 3,
            parallelism: 1
        });

        let date_of_original_appointment = null;
        let date_of_appointment = null;
        let resolved_date_hired = null;

        const nature = (nature_of_employment || '').toLowerCase();
        if (nature === 'permanent')       date_of_original_appointment = date_hired;
        else if (nature === 'casual')     date_of_appointment = date_hired;
        else                              resolved_date_hired = date_hired;

        const employeeData = {
            employee_no: employee_no.trim(),
            employee_id: employee_id?.trim(),
            account_no: account_no?.trim(),
            profile_pic,
            pin: hashedPin,
            first_name: first_name.trim(),
            middle_name: middle_name?.trim(),
            last_name: last_name.trim(),
            department, position, status,
            nature_of_employment,
            date_hired: resolved_date_hired,
            date_of_appointment,
            date_of_original_appointment,
            birthdate, civil_status, sex,
            tin, philhealth_no, gsis_no, sss_no,
            email: email?.trim().toLowerCase(),
            contact_no,
            emergency_contact_name,
            emergency_contact_phone
        };

        Employee.create(employeeData, (err) => {
            if (err) {
                console.error('createEmployee DB error:', err);
            
                return res.status(500).send('Error saving employee. Please try again.');
            }
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