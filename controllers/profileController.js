const Employee = require('../models/Employee');
const AuditLog  = require('../models/AuditLog');

exports.showProfile = (req, res) => {
    const id = req.session.employee.id;

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

    if (!first_name?.trim() || !last_name?.trim()) {
        req.session.flash_error = 'First name and last name are required.';
        return res.redirect('/profile');
    }

    // req.files is populated when multer is configured with .fields()
    // req.file  is populated when multer is configured with .single()
    // Support both patterns — whichever the route uses.
    const files = req.files || {};

    // profile_pic — null means "no new file; keep existing"
    let profile_pic = null;
    if (req.file && req.file.fieldname === 'profile_pic') {
        profile_pic = '/uploads/profile/' + req.file.filename;
    } else if (files.profile_pic && files.profile_pic[0]) {
        profile_pic = '/uploads/profile/' + files.profile_pic[0].filename;
    }

    // contract_file — null means "no new file; keep existing"
    let contract_file = null;
    if (files.contract_file && files.contract_file[0]) {
        contract_file = '/uploads/contracts/' + files.contract_file[0].filename;
    }

    const data = {
        first_name, middle_name, last_name,
        employee_id, department, position,
        email, contact_no, account_no,
        tin, philhealth_no, gsis_no, sss_no,
        emergency_contact_name, emergency_contact_phone,
        profile_pic,    // null → model skips this column
        contract_file,  // null → model skips this column
    };

    Employee.updateProfile(id, data, (err) => {
        if (err) {
            console.error('updateProfile error:', err);
            req.session.flash_error = 'An error occurred while updating your profile. Please try again.';
            return res.redirect('/profile');
        }

        // Keep session in sync
        req.session.employee.first_name = first_name.trim();
        req.session.employee.last_name  = last_name.trim();
        if (department)   req.session.employee.department  = department;
        if (position)     req.session.employee.position    = position;
        if (profile_pic)  req.session.employee.profile_pic = profile_pic;

        AuditLog.log({
            employee_id:   id,
            employee_name: `${first_name.trim()} ${last_name.trim()}`,
            action:        'UPDATE_PROFILE',
            details:       profile_pic ? 'Updated profile info and photo' : 'Updated profile info',
            ip_address:    req.ip,
        });

        req.session.flash_success = 'Profile updated successfully.';
        res.redirect('/profile');
    });
};