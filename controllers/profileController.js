const Employee = require('../models/Employee');

exports.showProfile = (req, res) => {
    const id = req.session.employee.id;

    // Pick up one-time flash messages and clear them immediately
    const msg   = req.session.flash_success || null;
    const error = req.session.flash_error   || null;
    delete req.session.flash_success;
    delete req.session.flash_error;

    Employee.getById(id, (err, results) => {
        if (err || results.length === 0) return res.redirect('/dashboard');

        res.render('profile', {
            employee: results[0],
            msg,
            error,
        });
    });
};

exports.updateProfile = (req, res) => {
    const id = req.session.employee.id;

    const {
        first_name, middle_name, last_name,
        employee_id, department, position,
        email, contact_no, account_no,
        tin, philhealth_no, gsis_no, sss_no,
        emergency_contact_name, emergency_contact_phone,
    } = req.body;

    // Basic server-side guard
    if (!first_name?.trim() || !last_name?.trim()) {
        req.session.flash_error = 'First name and last name are required.';
        return res.redirect('/profile');
    }

    let profile_pic = null;
    if (req.file) {
        profile_pic = '/uploads/' + req.file.filename;
    }

    const data = {
        first_name, middle_name, last_name,
        employee_id, department, position,
        email, contact_no, account_no,
        tin, philhealth_no, gsis_no, sss_no,
        emergency_contact_name, emergency_contact_phone,
        profile_pic,
    };

    Employee.updateProfile(id, data, (err) => {
        if (err) {
            console.error('updateProfile error:', err);
            req.session.flash_error = 'An error occurred while updating your profile. Please try again.';
            return res.redirect('/profile');
        }

        // Keep session name in sync with updated values
        req.session.employee.first_name = first_name.trim();
        req.session.employee.last_name  = last_name.trim();
        if (department) req.session.employee.department = department;
        if (position)   req.session.employee.position   = position;

        req.session.flash_success = 'Profile updated successfully.';
        res.redirect('/profile');
    });
};