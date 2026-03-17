const db = require('../config/db');

const Passlip = {
    generateNextSeq: (type, callback) => {
        const sql = "SELECT MAX(seq_no) AS mx FROM passlips WHERE type=?";
        db.query(sql, [type], (err, results) => {
            if (err) return callback(err);
            const nextSeq = (results?.[0]?.mx || 0) + 1;
            const prefix = type === 'regular' ? 'REG' : 'JO';
            const passlipNo = `${prefix}-${String(nextSeq).padStart(6,'0')}`;
            callback(null, { nextSeq, passlipNo });
        });
    },

    insertPasslip: (data, callback) => {
        const sql = `
            INSERT INTO passlips
            (type, seq_no, passlip_no, employee_id, pass_date, office_visit, purpose)
            VALUES (?,?,?,?,?,?,?)
        `;
        db.query(sql, [
            data.type,
            data.seq_no,
            data.passlip_no,
            data.employee_id,
            data.pass_date,
            data.office_visit,
            data.purpose
        ], callback);
    },

    // employeeId = null  → HR/admin: all records of this type
    // employeeId = <id>  → regular employee: only their own records
    findByType: (type, employeeId, callback) => {
        let sql = `
            SELECT p.*, 
                   CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name) AS employee_name,
                   e.employee_id,
                   e.department
            FROM passlips p
            LEFT JOIN employees e ON e.id = p.employee_id
            WHERE p.type = ?
        `;
        const params = [type];

        if (employeeId) {
            sql += ` AND p.employee_id = ?`;
            params.push(employeeId);
        }

        sql += ` ORDER BY p.id DESC`;
        db.query(sql, params, callback);
    },

    // employeeId = null  → HR/admin: all records
    // employeeId = <id>  → regular employee: only their own records
    findAll: (employeeId, callback) => {
        let sql = `
            SELECT p.*, 
                   CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name) AS employee_name,
                   e.employee_id,
                   e.department
            FROM passlips p
            LEFT JOIN employees e ON e.id = p.employee_id
        `;
        const params = [];

        if (employeeId) {
            sql += ` WHERE p.employee_id = ?`;
            params.push(employeeId);
        }

        sql += ` ORDER BY p.id DESC`;
        db.query(sql, params, callback);
    },

    findById: (id, callback) => {
        const sql = `
            SELECT p.*, 
                   CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name) AS employee_name,
                   e.employee_id,
                   e.department
            FROM passlips p
            LEFT JOIN employees e ON e.id = p.employee_id
            WHERE p.id = ?
        `;
        db.query(sql, [id], callback);
    },

    checkExistingForDate: (employee_id, pass_date, callback) => {
        const sql = `
            SELECT id FROM passlips 
            WHERE employee_id = ? AND pass_date = ?
            LIMIT 1
        `;
        db.query(sql, [employee_id, pass_date], callback);
    }
};

module.exports = Passlip;