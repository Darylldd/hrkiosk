const db = require('../config/db');

const Employee = {

    getAll: (callback) => {
        const sql = `SELECT * FROM employees ORDER BY first_name`;
        db.query(sql, callback);
    },

    getById: (id, callback) => {
        const sql = `SELECT * FROM employees WHERE id = ?`;
        db.query(sql, [id], callback);
    },

    findByEmployeeNo: (employee_no, callback) => {
        const sql = `SELECT * FROM employees WHERE employee_no = ?`;
        db.query(sql, [employee_no], callback);
    },

    create: (data, callback) => {
        const sql = `
            INSERT INTO employees (
                employee_no,
                employee_id,
                account_no,
                profile_pic,
                pin,
                first_name,
                middle_name,
                last_name,
                department,
                position,
                status,
                nature_of_employment,
                date_hired,
                date_of_appointment,
                date_of_original_appointment,
                birthdate,
                civil_status,
                sex,
                tin,
                philhealth_no,
                gsis_no,
                sss_no,
                email,
                contact_no,
                emergency_contact_name,
                emergency_contact_phone,
                contract_file
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(sql, [
            data.employee_no,
            data.employee_id,
            data.account_no,
            data.profile_pic,
            data.pin,
            data.first_name,
            data.middle_name,
            data.last_name,
            data.department,
            data.position,
            data.status,
            data.nature_of_employment,
            data.date_hired,
            data.date_of_appointment,
            data.date_of_original_appointment,
            data.birthdate,
            data.civil_status,
            data.sex,
            data.tin,
            data.philhealth_no,
            data.gsis_no,
            data.sss_no,
            data.email,
            data.contact_no,
            data.emergency_contact_name,
            data.emergency_contact_phone,
            data.contract_file,
        ], callback);
    },

    updateProfile: (id, data, callback) => {
        // Build the SET clause dynamically so that a null contract_file
        // (i.e. no new file was uploaded) does NOT overwrite the existing one.
        const fields = [
            'first_name = ?',
            'middle_name = ?',
            'last_name = ?',
            'employee_id = ?',
            'department = ?',
            'position = ?',
            'email = ?',
            'contact_no = ?',
            'account_no = ?',
            'tin = ?',
            'philhealth_no = ?',
            'gsis_no = ?',
            'sss_no = ?',
            'emergency_contact_name = ?',
            'emergency_contact_phone = ?',
        ];

        const values = [
            data.first_name,
            data.middle_name,
            data.last_name,
            data.employee_id,
            data.department,
            data.position,
            data.email,
            data.contact_no,
            data.account_no,
            data.tin,
            data.philhealth_no,
            data.gsis_no,
            data.sss_no,
            data.emergency_contact_name,
            data.emergency_contact_phone,
        ];

        // Only update profile_pic if a new file was supplied
        if (data.profile_pic !== null) {
            fields.push('profile_pic = ?');
            values.push(data.profile_pic);
        }

        // Only update contract_file if a new file was supplied
        if (data.contract_file !== null) {
            fields.push('contract_file = ?');
            values.push(data.contract_file);
        }

        values.push(id); // for WHERE id = ?

        const sql = `UPDATE employees SET ${fields.join(', ')} WHERE id = ?`;
        db.query(sql, values, callback);
    },

    updatePin: (id, pin, callback) => {
        const argon2 = require('argon2');
        argon2.hash(pin).then((hashed) => {
            const sql = `UPDATE employees SET pin = ? WHERE id = ?`;
            db.query(sql, [hashed, id], callback);
        }).catch(callback);
    },
};

module.exports = Employee;