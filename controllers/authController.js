const Employee = require('../models/Employee');
const AuditLog  = require('../models/AuditLog');
const argon2    = require('argon2');

exports.showLogin = (req, res) => {
    const error   = req.session.flash_error   || null;
    const success = req.session.flash_success || null;
    delete req.session.flash_error;
    delete req.session.flash_success;
    res.render('login', { error, success });
};

exports.login = async (req, res) => {
    const { employee_no, pin } = req.body;

    if (!employee_no || !pin) {
        req.session.flash_error = 'Employee number and PIN are required.';
        return res.redirect('/login');
    }

    Employee.findByEmployeeNo(employee_no, async (err, results) => {
        if (err) {
            console.error('DB error on login:', err);
            req.session.flash_error = 'A server error occurred. Please try again.';
            return res.redirect('/login');
        }

        if (results.length === 0) {
            req.session.flash_error = 'Invalid employee number or PIN.';
            return res.redirect('/login');
        }

        const employee = results[0];
        let valid = false;

        try {
            if (employee.pin.startsWith('$argon2')) {
                valid = await argon2.verify(employee.pin, pin);
            } else {
                if (employee.pin === pin) {
                    valid = true;
                    Employee.updatePin(employee.id, pin, (updateErr) => {
                        if (updateErr) console.error('Error upgrading legacy PIN:', updateErr);
                    });
                }
            }
        } catch (verifyErr) {
            console.error('Error verifying PIN:', verifyErr);
            req.session.flash_error = 'Authentication error. Please try again.';
            return res.redirect('/login');
        }

        if (!valid) {
            req.session.flash_error = 'Invalid employee number or PIN.';
            return res.redirect('/login');
        }

        // Assign role based on department / position
        let role = 'employee';
        const hrDepartments = ['HR', 'HRMU'];
        const hrPositions   = ['HR Manager', 'HR Officer'];
        if (hrDepartments.includes(employee.department) || hrPositions.includes(employee.position)) {
            role = 'hr';
        }

        req.session.employee = {
            id:          employee.id,
            employee_no: employee.employee_no,
            first_name:  employee.first_name,
            last_name:   employee.last_name,
            middle_name: employee.middle_name  || '',
            department:  employee.department,
            position:    employee.position,
            profile_pic: employee.profile_pic  || null,
            role,
        };

        AuditLog.log({
            employee_id:   employee.id,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            action:        'LOGIN',
            details:       `Logged in`,
            ip_address:    req.ip,
        });

        res.redirect('/dashboard');
    });
};

exports.dashboard = (req, res) => {
    const error   = req.session.flash_error   || null;
    const success = req.session.flash_success || null;
    delete req.session.flash_error;
    delete req.session.flash_success;

    res.render('dashboard', {
        employee: req.session.employee,
        error,
        success,
    });
};

exports.logout = (req, res) => {
    const emp = req.session?.employee;
    if (emp) {
        AuditLog.log({
            employee_id:   emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            action:        'LOGOUT',
            details:       'Logged out',
            ip_address:    req.ip,
        });
    }
    req.session.destroy(() => res.redirect('/login'));
};

exports.setFlash = (req, res, type, message, redirectTo = '/dashboard') => {
    req.session[`flash_${type}`] = message;
    res.redirect(redirectTo);
};