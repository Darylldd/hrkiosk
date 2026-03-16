const Employee = require('../models/Employee');

exports.showProfile = (req, res) => {
    const id = req.session.employee.id;

    Employee.getById(id, (err, results) => {
        if (err || results.length === 0) {
            return res.redirect('/dashboard');
        }

        res.render('profile', {
            employee: results[0],
            msg: req.query.msg,
            error: req.query.error
        });
    });
};

exports.updateProfile = (req, res) => {

    const id = req.session.employee.id;

    const {
        first_name,
        middle_name,
        last_name,
        employee_id,
        department,
        position,
        email,
        contact_no,
        account_no,
        tin,
        philhealth_no,
        gsis_no,
        sss_no,
        emergency_contact_name,
        emergency_contact_phone
    } = req.body;

    let profile_pic = null;

    if (req.file) {
        profile_pic = '/uploads/' + req.file.filename;
    }

    const data = {
        first_name,
        middle_name,
        last_name,
        employee_id,
        department,
        position,
        email,
        contact_no,
        account_no,
        tin,
        philhealth_no,
        gsis_no,
        sss_no,
        emergency_contact_name,
        emergency_contact_phone,
        profile_pic
    };

    Employee.updateProfile(id, data, (err) => {
        if (err) {
            console.log(err);
            return res.redirect('/profile?error=Error updating profile');
        }

        res.redirect('/profile?msg=Profile updated successfully');
    });
};