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
                emergency_contact_phone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            data.emergency_contact_phone
        ], callback);
    },

    updateProfile: (id, data, callback) => {
        const sql = `
            UPDATE employees SET
                first_name = ?,
                middle_name = ?,
                last_name = ?,
                employee_id = ?,
                department = ?,
                position = ?,
                email = ?,
                contact_no = ?,
                account_no = ?,
                tin = ?,
                philhealth_no = ?,
                gsis_no = ?,
                sss_no = ?,
                emergency_contact_name = ?,
                emergency_contact_phone = ?,
                profile_pic = ?
            WHERE id = ?
        `;

        db.query(sql, [
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
            data.profile_pic,
            id
        ], callback);
    },
       updatePin: (id, pin, callback) => {
        const argon2 = require('argon2');
        argon2.hash(pin).then((hashed) => {
            const sql = `UPDATE employees SET pin = ? WHERE id = ?`;
            db.query(sql, [hashed, id], callback);
        }).catch(callback);
    }

};

module.exports = Employee;
